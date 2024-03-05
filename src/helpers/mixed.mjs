function printMessages( { messages=[], comments=[] } ) {
    const n = [
        [ comments, 'Comment', false ],
        [ messages, 'Message', true ]
    ]
        .forEach( ( a, index ) => {
            const [ msgs, headline, stop ] = a
            msgs
                .forEach( ( msg, rindex, all ) => {
                    rindex === 0 ? console.log( `\n${headline}${all.length > 1 ? 's' : ''}:` ) : ''
                    console.log( `  - ${msg}` )
                    console.log()
                    if( ( all.length - 1 ) === rindex ) {
                        if( stop === true ) {
                            throw new Error()
                        }
                    }
                } )
        } )

    return true
}

/*
function printConsole( { pre, value, second } ) {
    const space = new Array( 25 - pre.length ).fill( " " ).join( "" )

    console.log( `${pre}${space}${value}` )
    if( second !== undefined ) {
        const n = new Array( 25 ).fill( " " ).join( "" )
        console.log( `${n}${second}` )
    }

    return true
}
*/

function printConsole( { first, second } ) {
    if( first !== undefined ) {
        const space = new Array( 25 - first.length ).fill( ' ' ).join( '' )
        process.stdout.write( `${first}${space}` )
    }

    if( second !== undefined ) {
        const greenColor = '\x1b[32m';
        const resetColor = '\x1b[0m';
        console.log( greenColor + second + resetColor )
    }
} 


export { printConsole, printMessages }