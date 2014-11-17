
macro async {
    case { $async function* $name ($args ...) { $body ... } } => {
        
        function getPattern(patterns, stxs, context, result) {
            return patterns.reduce(function(matchedStx, pattern) {
                return matchedStx.length > 0 && matchedStx || (
                    patternModule.matchPatterns(pattern, stxs, context, true).result
                );
            }, []);
        }
        
        function findPattern(patterns, stxs, context, result) {
            return (result = patterns.reduce(function(matchedStx, pattern) {
                return matchedStx.length > 0 && matchedStx || (
                    patternModule.matchPatterns(pattern, stxs, context, true).result
                );
            }, [])) && result.length > 0 && result || undefined;
        }
        
        function replaceEverything(ctx, specialPatterns, replaceFn, stxs) {
            var stx, result, newStxs = [], newStxsLen = 0;
            
            while(stxs.length > 0) {
                stx = stxs[0];
                if(stx.token && (
                    stx.token.type === parser.Token.Keyword) && (
                    stx.token.value === "function")) {
                    result = [];
                    while(stx && stx.token && (
                        stx.token.type !== parser.Token.Delimiter || (
                        stx.token.value !== "{}"))) {
                        stx = stxs[result.push(stx)];
                    }
                    if(stx) {
                        result.push(stx);
                    }
                    newStxsLen = newStxs.push.apply(newStxs, result);
                    stxs = stxs.slice(result.length);
                } else if(result = findPattern(specialPatterns, stxs, ctx)) {
                    if((stx = result[result.length - 1]) && (
                        stx.token && stx.token.value === ";")) {
                        newStxsLen = newStxs.push.apply(newStxs, 
                            replaceFn(ctx, result.slice(1, -1)).concat(makePunc(";", ctx)));
                    } else {
                        newStxsLen = newStxs.push.apply(newStxs, replaceFn(ctx, result.slice(1)));
                    }
                    stxs = stxs.slice(result.length);
                } else if(stx && stx.token && stx.token.type === parser.Token.Delimiter) {
                    stx = stx.expose();
                    stx.token.inner = replaceEverything(ctx, specialPatterns, replaceFn, stx.token.inner || []);
                    newStxs[newStxsLen++] = stx;
                    stxs = stxs.slice(1);
                } else {
                    newStxs[newStxsLen++] = stx;
                    stxs = stxs.slice(1);
                }
            }
            return newStxs;
        }
        
        function getNextCall(ctx, expr) {
            return [
                makeIdent("observer", ctx),
                makePunc(".", ctx),
                makeIdent("next", ctx),
                makeDelim("()", expr, ctx)
            ];
        }
        
        function getAwait(ctx, expr) {
            return [makeKeyword("yield", ctx)].concat(expr);
        }
        
        var yieldPatterns = [
                patternModule.loadPattern(#{ yield $x:expr ; }),
                patternModule.loadPattern(#{ yield $x:expr })
            ],
            awaitPatterns = [
                patternModule.loadPattern(#{ await $x:expr ; }),
                patternModule.loadPattern(#{ await $x:expr })
            ];
        
        return withSyntax(
            $replacedYieldStxs ... = replaceEverything(
                #{ here }, awaitPatterns, getAwait,
                replaceEverything(#{ here }, yieldPatterns, getNextCall, localExpand(#{ $body ... })))
        ) #{
            function $name ($args ...) {
                return new Observable(function(observer) {
                    var decoratedObserver = decorate(observer);
                    spawn(function*() {
                        $replacedYieldStxs ...
                    }).then(
                        decoratedObserver.return.bind(decoratedObserver),
                        decoratedObserver.throw.bind(decoratedObserver)
                    );
                    return decoratedObserver;
                })
            }
        }
    }
}

let for = macro {
    case { _ ( $x:ident on $y:expr ) { $body ... } } => {
        return #{
            await $y.forEach(function() {
                $x = arguments[0];
                $body ...
            });
        }
    }
    case { _ ( var $x:ident on $y:expr ) { $body ... } } => {
        return #{
            await $y.forEach(function($x) { $body ... });
        }
    }
    case { _ } => { return #{ } }
}

let await = macro {
    rule { $x:expr } => { await($x) }
    rule { }
}

async function* bar(x, y) {
    
    for(var x on getY()) {
        console.log("on y");
    }
    
    var z;
    
    for(z on getY()) {
        console.log("on z");
    }
    
    z = "foo";
    
    yield 3;
    await getName();
    yield foo;
    await yield otherThing();
    
    function foo() {
        yield "shouldn't replace this";
        await yield otherThing();
    }
    
    while (false) {
        yield 10;
    }
    
    yield (async function* baz(z, a) {
        
    });
}








