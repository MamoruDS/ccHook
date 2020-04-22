# ccHook

## Usage

```shell
npm i cchook
```

### server

Build before use

```shell
npm run build
```

Start ccHook server

```shell
node dist/index.js --server
node dist/index.js --server --password='passwd' --port=80
```

Add a new user with alias

```shell
node dist/index.js --addUser='username'
```

### client

```typescript
const { Client } = require('cchook')

const client = new Client({
    user: 'USER-AAAAAA-00000000000-AAAAAA',
    password: 'YOURPASSWD',
    address: 'http://127.0.0.1',
    port: 8030,
})

client.interval = 1000
client.timeout = 5000
client.start()

client.on('request', (data) => {
    console.log(data)
})

// type of data above
type Data = {
    request: {
        body: {
            [key: string]: string | number | boolean | null
        }
        headers: {
            [key: string]: string
        }
    }
}
```

## License

MIT License
copyright © 2020 MamoruDS
