import yargs = require('yargs')
import { getSTO } from './sto'
export { router } from './server'

const argv = yargs.options({
    addUser: { type: 'string' },
    server: { type: 'boolean' },
    password: { type: 'string' },
    address: { type: 'string' },
    port: { type: 'number', default: 8030 },
}).argv

export const options = {} as {
    password: string
    user: string
    address: string
    port: number
    pendingId: number
}

options.password = argv.password || process.env.CC_PASSWORD
options.address = argv.address || process.env.CC_SERVER_ADDR
options.port = argv.port || parseInt(process.env.CC_PORT)

import { server as _server } from './server'
export { CCHookClient as Client } from './client'

const main = () => {
    if (argv.addUser) {
        const alias = argv.addUser
        const sto = getSTO()
        const id = sto.user.add(alias)
        console.log(`Added new user '${alias}' with ID:${id}`)
    }
    if (argv.server) {
        _server()
    }
}

main()
