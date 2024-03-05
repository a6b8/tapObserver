import { TapObserver } from '../src/TapObserver.mjs'
import { io } from 'socket.io-client'


const tapObserver = new TapObserver()
await tapObserver.init( {
    'cronInSeconds': 1,
    'cronChannels': [  
        'deployments', 

        'mintList', 'dmtElementsList',
        'transferList', 'tradesList', 'tradesFilledList', 'sentList',
        'authList', 'redeemList', 'accumulatorList' 

]
} )


tapObserver.start()
// tapObserver.updateChannelsLengthStart()

// tapObserver.start()