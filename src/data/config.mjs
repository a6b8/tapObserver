import { printMessages } from './../helpers/mixed.mjs'   


let template = {
    'protocol': {
        'use': 'unsecure',
        'unsecure': {
            'websocket': 'ws://localhost',
            'rest': 'http://localhost'
        },
        'secure': {
            'websocket': 'wss://localhost',
            'rest': 'https://localhost'
        }
    },
    'websocket': {
        'port': 5095,
        'url': null, 
        'socketIo': {
            'autoConnect' : true,
            'reconnection': true,
            'reconnectionDelay': 500,
            'reconnectionDelayMax' : 500,
            'randomizationFactor' : 0
        },
        'chunkSize': 500
    },
    'rest': {
        'port': 5099,
        'url': null
    },
    'tap': {
        'block': {
            'length': {
                'rest': 'getCurrentBlock'
            }
        },
        'channels': {
            'accumulatorList': {
                'length': {
                    'ws': [ 'get', 'accumulatorListLength' ],
                    'rest': 'getAccumulatorListLength'
                },
                'offset': {
                    'ws': [ 'get', 'accumulatorList' ],
                    'rest': 'getAccumulatorList'
                }
            },
            'authList': {
                'length': {
                    'ws': [ 'get', 'authListLength' ],
                    'rest': 'getAuthListLength'
                },
                'offset': {
                    'ws': [ 'get', 'authList' ],
                    'rest': 'getAuthList'
                }
            },
            'deployments': {
                'length': {
                    'ws': [ 'get', 'deploymentsLength' ],
                    'rest': 'getDeploymentsLength'
                },
                'offset': {
                    'ws': [ 'get', 'deployments' ],
                    'rest': 'getDeployments'
                }
            },
            'dmtElementsList': {
                'length': {
                    'ws': [ 'get', 'dmtElementsListLength' ],
                    'rest': 'getDmtElementsListLength'
                },
                'offset': {
                    'ws': [ 'get', 'dmtElementsList' ],
                    'rest': 'getDmtElementsList'
                }
            },
            'mintList': {
                'length': {
                    'ws': [ 'get', 'mintListLength' ],
                    'rest': 'getMintListLength'
                },
                'offset': {
                    'ws': [ 'get', 'mintList' ],
                    'rest': 'getMintList'
                }
            },
            'redeemList': {
                'length': {
                    'ws': [ 'get', 'redeemListLength' ],
                    'rest': 'getRedeemListLength'
                },
                'offset': {
                    'ws': [ 'get', 'redeemList' ],
                    'rest': 'getRedeemList'
                }
            },
            'sentList': {
                'length': {
                    'ws': [ 'get', 'sentListLength' ],
                    'rest': 'getSentListLength'
                },
                'offset': {
                    'ws': [ 'get', 'sentList' ],
                    'rest': 'getSentList'
                }
            },
            'tradesFilledList': {
                'length': {
                    'ws': [ 'get', 'tradesFilledListLength' ],
                    'rest': 'getTradesFilledListLength'
                },
                'offset': {
                    'ws': [ 'get', 'tradesFilledList' ],
                    'rest': 'getTradesFilledList'
                }
            },
            'tradesList': {
                'length': {
                    'ws': [ 'get', 'tradesListLength' ],
                    'rest': 'getTradesListLength'
                },
                'offset': {
                    'ws': [ 'get', 'tradesList' ],
                    'rest': 'getTradesList'
                }
            },
            'transferList': {
                'length': {
                    'ws': [ 'get', 'transferListLength' ],
                    'rest': 'getTransferListLength'
                },
                'offset': {
                    'ws': [ 'get', 'transferList' ],
                    'rest': 'getTransferList'
                }
            }
        }
    }
}


function getConfig( { protocol='unsecure' } ) {
    const [ messages, comments ] = validateGetConfig( { protocol } )
    printMessages( { messages, comments } )

    const config = JSON.parse( JSON.stringify( template ) )

    let protocolType
    if( protocol === undefined ) {
        protocolType = config['protocol']['use']    
    } else {
        protocolType = protocol
    }
    
    const tmp = [ 'websocket', 'rest' ]
        .forEach( key => {
            config[ key ]['url'] = ''
            config[ key ]['url'] += config['protocol'][ protocolType ][ key ]
            config[ key ]['url'] += `:${config[ key ]['port']}`
        } )

    return config
}


function validateGetConfig( { protocol } ) {
    const messages = []
    const comments = []

    const validKeys = [ 'unsecure', 'secure']
    if( protocol === undefined ) {
        comments.push( `Protocol is "undefined" use default "${template['protocol']['use']}" instead.` )
    } else if( typeof protocol !== 'string' ) {
        messages.push( 'Protocol is not a string' )
    } else if( validKeys.includes( protocol ) === false ) {
        messages.push( `Protocol is not valid. Valid keys are: ${validKeys.join( ', ' )}` )
    }

    return [ messages, comments ]
}


export { getConfig }