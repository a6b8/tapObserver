import { io } from 'socket.io-client'
import cron from 'node-cron'
import axios from 'axios'
import figlet from 'figlet'

import { getConfig } from './data/config.mjs'
import { printMessages, printConsole } from './helpers/mixed.mjs'
import { DynamicAsciiTable } from 'dynamic-ascii-table'

export class TapObserver {
    #config
    #trac
    #terminal
    #state


    constructor() {
        this.#config = getConfig( {})
        return true
    }


    async init( { cronInSeconds, cronChannels } ) {
        console.log( figlet.textSync( 'Tap Observer' ) ) 
        printConsole( { 'first': 'Init Trac' } )

        const [ messages, comments ] = this.#validateInit( { cronInSeconds, cronChannels } )
        printMessages( { messages, comments } )

        this.#trac = io(
            this.#config['websocket']['url'],
            this.#config['websocket']['socketIo']
        )

        this.#trac.connect()
        this.#addListeners()
        printConsole( { 'second': 'Success' } )

        this.#state = {
            'cron': {
                'intervalInSeconds': cronInSeconds,
                'selectedChannels': cronChannels,
                'code': `*/${cronInSeconds} * * * * *`
            },
            'ping': null
        }

        this.#terminal = new DynamicAsciiTable()
        this.#terminal.init( { 
            'columnNames': [ 'block', 'time', ...cronChannels ], 
            'columnLengths': [ 10, 10, ...cronChannels.map( a => 10 ) ], 
            'columnAlignments': [ 'right', 'right', ...cronChannels.map( a => 'right' ) ]
        } )
        // this.#terminal.printTableHeader()
        this.#state['ping'] = await this.#addChannels()
        this.#terminal.print()

        return true
    }


    start() {
        let seconds = 0

        cron.schedule(
            this.#state['cron']['code'], 
            async() => {
                seconds = seconds + 1 
                if( this.#state['ping']['block']['balance'] === 0 ) {

                    this.#state['ping']['block']['balance']++
                    const [ isNewBlock, result ] = await this.#checkNewBlock()
                    if( isNewBlock === true ) {
                        seconds = 0
                        this.#state['ping']['block']['lastResult'] = result
                        // console.log( 'New Block detected' )
                        this.updateChannelsLengthStart( { 'blockHeight': result } )
                    }
                    this.#state['ping']['block']['balance']--

                    this.#terminal.setValue( {
                        'rowIndex': result, 
                        'columnName': 'time', 
                        'value': seconds
                    } )
                    // this.#terminal.print()
                }

                if( seconds % 10 === 0 ) {
                    this.#terminal.setValue( {
                        'rowIndex': result, 
                        'columnName': 'time', 
                        'value': seconds
                    } )
                    // this.#terminal.print()

                    this.updateChannelsLengthStart( {
                        'blockHeight': this.#state['ping']['block']['lastResult']
                    } )
                } else {
                    // process.stdout.write( '.' )
                }
            }
        )

        return true
    }


    async #addChannels() {
        // printConsole( { 'first': 'Fetch Data' } )
        const result = {
            'block': {
                'state': null,
                'balance': 0,
                'nonce': 0,
                'lastResult': null
            },
            'channels': null
        }

        const url = this.#config['rest']['url']
        const ping = this.#config['tap']['block']['length']['rest']

        try {
            const block = await axios.get( `${url}/${ping}` )
            result['block']['lastResult'] = block['data']['result']
            result['block']['state'] = 'active'
        } catch( e ) {
            result['block']['state'] = 'error'
        }

        if( result['block']['state'] === 'error' ) {
            return result
        }

        const tree = this.#state['cron']['selectedChannels']
            .reduce( ( acc, channel, index ) => {
                acc[ channel ] = {
                    'state': null,
                    'balance': 0,
                    'nonce': 0,
                    'lastResult': null
                }

                return acc
            }, {} )

        const results = await Promise.all( 
            Object
                .entries( tree )
                .map( async( [ key, value ] ) => {
                    try {
                        const func = this.#config['tap']['channels'][ key ]['length']['rest']
                        const result = await axios.get( `${url}/${func}` )
                        value['lastResult'] = result['data']['result']
                        value['state'] = 'active'
                    } catch( e ) {
                        value['state'] = 'error'
                    }

                    return [ key, value ]
                } )
        )

        result['channels'] = results
                .reduce( ( acc, [ key, value] ) => {
                    acc[ key ] = value 
                    return acc
                }, {} )

        // printConsole( { 'second': 'Success' } )
        Object
            .entries( result )
            .forEach( ( a, index ) => {
                const [ key, value ] = a

                if( key === 'block' ) {
                    // printConsole( { 'first': `  ${key}` } )
                    // printConsole( { 'second': `${value['lastResult']}` } )
                } else if( key === 'channels' ) {
                    // printConsole( { 'first': `    ${key}`, 'second': '' } )
                    Object
                        .entries( value )
                        .forEach( ( a, index ) => {
                            const [ key, value ] = a

                            this.#terminal.setValue( { 
                                'rowIndex': result['block']['lastResult'], 
                                'columnName': key, 
                                'value': value['lastResult']
                            } )
                            // printConsole( { 'first': `  ${key}` } )
                            // printConsole( { 'second': `${value['lastResult']}` } )
                        } )
                }
            } )

        return result
    }


    #addListeners() {
        this.#trac.on(
            'response', 
            async( msg ) => this.#websocketResponseCentral( { msg, 'status': 'response' } )                
        )
          
        this.#trac.on(
            'error', 
            async( msg ) => this.#websocketResponseCentral( { msg, 'status': 'error' } )
        )

        return true
    }


    async #websocketResponseCentral( { msg, status } ) {
        const { type, key, blockHeight } = msg['call_id']

        switch( type ) {
            case 'length': {
                    const [ update, offset, max, length ] = await this
                        .#updateChannelsLengthFinish( { msg, status } )
                    if( update === true ) {
                        // console.log( key, blockHeight, update, offset, max, length )
                        this.#terminal.setValue( { 
                            'rowIndex': blockHeight, 
                            'columnName': key, 
                            'value': offset //`${length} (${offset})`
                        } )
                        this.#terminal.print()
                        // console.log( 'Update is true', offset, max  )
                    }
                }
                break
            case 'result':
                break
            default:
                console.log( `Type with the value "${type}" not found.` )
                break
        }

        return true
    }


    updateChannelsLengthStart( { blockHeight } ) {
        const selection = this.#state['cron']['selectedChannels']
            .filter( key => this.#state['ping']['channels'][ key ]['balance'] === 0 )
            .forEach( key => {
                if( this.#state['ping']['channels'][ key ]['balance'] === 0 ) {
                    this.#state['ping']['channels'][ key ]['balance']++
                    const request = this.#config['tap']['channels'][ key ]['length']['ws']
                    const [ type, func ] = request
                    const lastResult = this.#state['ping']['channels'][ key ]['lastResult']
                    this.#trac.emit( 
                        type, 
                        { 
                            func, 
                            'args': [], 
                            'call_id': { key, 'type': 'length', lastResult, blockHeight }
                        }
                    )
                }
            } )

        return true
    }


    async #updateChannelsLengthFinish( { msg, status } ) {
        let update = false
        let offset
        let max
        let length

        const { key, blockHeight } = msg['call_id']
        this.#state['ping']['channels'][ key ]['balance']--

        switch( status ) {
            case 'response':
                const [ isNewResult ] = this.#checkChannelUpdate( { msg } )
                if( isNewResult === true ) {
                    const currentValue = this.#state['ping']['channels'][ key ]['lastResult']
                    const newValue = msg['result']
                    this.#state['ping']['channels'][ key ]['lastResult'] = newValue
                    // console.log( `Update ${key} from ${currentValue} to ${newValue}` )
                    update = true
                    max = newValue - currentValue
                    offset = newValue - max,
                    length = newValue
                }

                break
            case 'error':
                console.log( 'error >', msg )
                break
            default:
                console.log( 'Unknown status' )
                break
        }

        return [ update, offset, max, length ]
    }


    async #checkNewBlock() {
        let isNewBlock
        let result = null
        try {
            const { url } = this.#config['rest']
            const { rest: block } = this.#config['tap']['block']['length']
            const response = await axios.get( `${url}/${block}` )

            if( typeof response['data']['result'] !== 'number' ) {
                isNewBlock = false
            } else if( response['data']['result'] !== this.#state['ping']['block']['lastResult'] ) {
                result = response['data']['result']
                isNewBlock = true
            } else {
                result = response['data']['result']
                isNewBlock = false
            }
        } catch( e ) {
            isNewBlock = false
        }

        return [ isNewBlock, result ]
    }


    #checkChannelUpdate( { msg } ) {
        let isNewResult

        if( !Object.hasOwn( msg, 'result' ) ) {
            isNewResult = false
        } else if( typeof msg['result'] !== 'number' ) {
            isNewResult = false
        } else if( msg['result'] > msg['call_id']['lastResult'] ) {
            isNewResult = true
        } else {
            isNewResult = false
        }

        return [ isNewResult ]
    }


    #validateInit( { cronInSeconds, cronChannels } ) {
        const messages = []
        const comments = []

        if( cronInSeconds === undefined ) {
            messages.push( `variable 'cronInSeconds' is undefined` )
        } else if( typeof cronInSeconds !== 'number' ) {
            messages.push( `variable 'cronInSeconds' is not a number` )
        } else {}

        if( cronChannels === undefined ) {
            messages.push( `variable 'cronChannels' is undefined` )
        } else if( Array.isArray( cronChannels ) === false ) {
            messages.push( `variable 'cronChannels' is not an array` )
        } else {
            const validKeys = Object.keys( this.#config['tap']['channels'] )

            const errors = cronChannels
                .reduce( ( acc, channel, index ) => {
                    if( typeof channel !== 'string' ) {
                        acc[ 0 ].push( index )
                    } else if( validKeys.includes( channel ) !== true ) {
                        acc[ 1 ].push( index )
                    }

                    return acc
                }, [ [], [] ] )
                .forEach( ( err, index ) => {
                    if( err.length > 0 ) {
                        let msg = ''
                        msg += `CronChannels [${err.join( ', ' )}] `
                        if( index === 0 ) {
                            msg += 'is not type of "string".'
                        } else if( index === 1 ) {
                            msg += `is not a valid key. Choose from ${validKeys.join( ', ' )} instead.`
                        }

                        messages.push( msg )
                    }
                } )
        }

        return [ messages, comments ]
    }
}

