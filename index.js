const { Client } = require('discord.js')
const fs = require('fs')
const client = new Client()
const yaml = require('js-yaml')
const chalk = require('chalk')
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'))

client.config = config

fs.readdir('./events/', (err, files) => {
    if (err) return console.error(err)
    files.forEach(file => {
        const event = require(`./events/${file}`)
        const eventName = file.split('.')[0]
        client.on(eventName, event.bind(null, client))
    })
})

if (config.token === 'BOT TOKEN' || !config.token) {
    console.log(chalk.red('[@/index.js:20] Token invalid, exiting.'))
    process.exit(1)
} else {
    client.login(config.token)
}
