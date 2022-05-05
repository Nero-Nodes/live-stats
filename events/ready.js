module.exports = client => {  
  const { MessageEmbed } = require('discord.js')
  const axios = require('axios')
  const db = require('quick.db')
  const nodetable = new db.table('node')
  const paneltable = new db.table('panel')
  const chalk = require('chalk')
  const config = client.config

  let enablecs = config.botstatus.enable
  let cs = config.botstatus.text
  let stype = config.botstatus.type
  let ch = client.channels.cache.find(cn => cn.id === config.channel)
  let time = config.refreshtime

  let hosturl = config.panel.url
  let adminapikey = config.panel.adminkey

  let statusonline = config.status.online
  let statusoffline = config.status.offline
  let checking = config.status.check
  let resource = config.resource.enable
  let serverres = config.resource.servers
  let serverport = config.resource.allocations
  let serverloc = config.resource.location
  let unit = config.resource.unit

  let title = config.embed.title
  let color = config.embed.color
  let desc = config.embed.description.text
  let footer = config.embed.footer.text
  let enablets = config.embed.timestamp
  let enabledesc = config.embed.description.enable
  let enablef = config.embed.footer.enable

  let debug = config.debug
  let debugerror = config.debugaxios

  if (debug === true) {
    console.log(chalk.red('=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+='))
    console.log(chalk.magenta('[PteroStats Debug] ') + chalk.green('Debug Mode: ') + chalk.cyan('true'))
    console.log(chalk.magenta('[PteroStats Debug] ') + chalk.green('Debug Axios Mode: ') + chalk.cyan(debugerror))
    console.log(chalk.magenta('[PteroStats Debug] ') + chalk.green('Resource: ') + chalk.cyan(resource))
    console.log(chalk.magenta('[PteroStats Debug] ') + chalk.green('Custom Status: ') + chalk.cyan(enablecs))
    console.log(chalk.magenta('[PteroStats Debug] ') + chalk.green('Enable Timestamp: ') + chalk.cyan(enablets))
    console.log(chalk.magenta('[PteroStats Debug] ') + chalk.green('Enable Description: ') + chalk.cyan(enabledesc))
    console.log(chalk.magenta('[PteroStats Debug] ') + chalk.green('Enable Footer: ') + chalk.cyan(enablef))
  }

  if (!hosturl.includes('http')) hosturl = 'http://' + hosturl
  let unapi = hosturl + '/api'
  let api = unapi.replace('//api', '/api')

  if (enablecs === true) {
    client.user.setActivity(cs, { type: stype })
  } else {
    client.user.setActivity(title + 'the sound of pings', { type: 'LISTENING' })
  }

  console.log(chalk.green('Name: ') + chalk.cyan(client.user.username))
  console.log(chalk.green('Version: ') + chalk.cyan(require('../package.json').version))
  console.log(chalk.green('Refresh Time: ') + chalk.cyan(time + 's'))
  
  if(paneltable.get('URL') === null) console.log(chalk.cyan('Database is empty, assuming this startup is for first-time use.'))
  if(paneltable.get('URL') !== api) console.log(chalk.cyan('Panel URL has changed. Allow the bot to scan nodes for ' + time + 's.'))

  paneltable.set('URL',api)

  setInterval(() => {
    if (isNaN(time)) return console.log(chalk.cyan('[live-stats@/events/ready.js:70] ') + chalk.red(time + ' is not a number.'))
    if (!hosturl.includes('.')) return console.log(chalk.cyan('[live-stats@/events/ready.js:71] ') + chalk.red(hosturl + ' is invalid.'))
    if (adminapikey.length < 48) return console.log(chalk.cyan('[live-stats@/events/ready.js:72] ') + chalk.red('API Key is invalid.'))

    let list = []
    axios(api + '/application/nodes/', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + adminapikey
      }
    }).then(async (response) => {
      let data = response.data.data
      data.forEach(nodes => {
        let id = nodes.attributes.id
        axios(api + '/application/nodes/' + id + '?include=servers,location,allocations', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + adminapikey
          }
        }).then(node => {
          axios(api + '/application/nodes/' + id + '/configuration', {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + adminapikey
            }
          }).then(data => {
            axios(node.data.attributes.scheme + '://' + node.data.attributes.fqdn + ':' + node.data.attributes.daemon_listen + '/api/servers', {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + data.data.token
              }
            }).then(status => {
              let ram = 'temp'
              let disk = 'temp'

              const mode = node.data.attributes.maintenance_mode
              const loc = '[Locations: ' + node.data.attributes.relationships.location.attributes.short + ']'
              const port = '[Allocations: ' + node.data.attributes.relationships.allocations.data.length + ']'
              const servers = '[Servers: ' + node.data.attributes.relationships.servers.data.length + ']'
              const rampercent = '[Ram: ' + Math.floor(node.data.attributes.allocated_resources.memory / node.data.attributes.memory * 100) + '%/100%]'
              const diskpercent = '[Disk: ' + Math.floor(node.data.attributes.allocated_resources.disk / node.data.attributes.disk * 100) + '%/100%]'
              const rammega = '[Ram: ' + node.data.attributes.allocated_resources.memory + 'MB/' + node.data.attributes.memory + 'MB]'
              const diskmega = '[Disk: ' + node.data.attributes.allocated_resources.disk + 'MB/' + node.data.attributes.disk + 'MB]'
              const ramgiga = '[Ram: ' + Math.floor(node.data.attributes.allocated_resources.memory / 1000) + 'GB/' + Math.floor(node.data.attributes.memory / 1000) + 'GB]'
              const diskgiga = '[Disk: ' + Math.floor(node.data.attributes.allocated_resources.disk / 1000) + 'GB/' + Math.floor(node.data.attributes.disk / 1000) + 'GB]'
              if (unit === 'mb') {
                disk = diskmega
                ram = rammega
              }
              if (unit === 'gb') {
                disk = diskgiga
                ram = ramgiga
              }
              if (unit === 'percent') {
                disk = diskpercent
                ram = rampercent
              }

              nodetable.set('node' + id, {
                ram: ram,
                disk: disk,
                status: true,
                servers: servers,
                location: loc,
                port: port,
                mode: mode
              })

            }).catch((err) => {
              let servers = '[Servers: Unavailable]'
              let loc = '[Location: Unavailable]'
              let port = '[Allocations: Unavailable]'
              let ram = '[Ram: Unavailable]'
              let disk = '[Disk: Unavailable]'

              console.log(chalk.cyan('[live-stats@/events/ready.js:153] ') + chalk.red(node.data.attributes.name + ' is offline.'))

              nodetable.set('node' + id, {
                ram: ram,
                disk: disk,
                status: false,
                servers: servers,
                location: loc,
                port: port,
                mode: false
              })
            })
          }).catch((err) => {
            console.log(chalk.magenta('[live-stats@/events/ready.js:166] ') + chalk.red(err))
          })
        }).catch((err) => {
          console.log(chalk.magenta('[live-stats@/events/ready.js:169] ') + chalk.red(err))
        })

        let stats = nodetable.get('node' + id)
        let msgStats;
        if (`${stats}` === 'null') msgStats = '**' + nodes.attributes.name + '**: ' + checking + '\n'
        if (`${stats}` !== 'null') {
          let statsname = '**' + nodes.attributes.name + '**: '

          if (stats.status === true) statsname = statsname + statusonline
          if (stats.status === false) statsname = statsname + statusoffline
            
          if (resource === false) msgStats = statsname + '\n'

          if (stats.mode === true) statsname = statsname + ' Maintainence Mode'

          if (resource === true) statsname = statsname + '\n```\n' + stats.ram + '\n' + stats.disk
          if (serverloc === true) statsname = statsname + '\n' + stats.location
          if (serverport === true) statsname = statsname + '\n' + stats.port
          if (serverres === true) statsname = statsname + '\n' + stats.servers
          if (resource === false) statsname = statsname + '\n'

          if (resource === true) msgStats = statsname + '```\n'
        }

        list.push(msgStats)
      })

      axios(api + '/application/servers', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + adminapikey
        }
      }).then(ser => {
        let res = ser.data.meta.pagination.total
        paneltable.set('serverCount', res)
      }).catch((err) => {
        paneltable.set('serverCount', 'Unavailable')
        console.log(chalk.cyan('[live-stats@/events/ready.js:209] ') + chalk.red('Unable to reach Panel API, assuming system is down.'))
        if (debugerror === true) console.log(chalk.magenta('[live-stats@/events/ready.js:210] ') + err)
      })

      axios(api + '/application/users', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + adminapikey
        }
      }).then(usr => {
        let res = usr.data.meta.pagination.total
        paneltable.set('userCount', res)
      }).catch((err) => {
        paneltable.set('userCount', 'Unavailable')
        console.log(chalk.cyan('[live-stats@/events/ready.js:225] ') + chalk.red('Unable to reach Panel API, assuming system is down.'))
        if (debugerror === true) console.log(chalk.magenta('[live-stats@/events/ready.js:226] ') + err)
      })

      let userCount = paneltable.get('userCount')
      let serverCount = paneltable.get('serverCount')

      if (userCount === null) userCount = '...'
      if (serverCount === null) serverCount = '...'

      if (userCount !== 'Unavailable') paneltable.set('panel', '**Panel**: ' + statusonline)
      if (userCount === 'Unavailable') {
        paneltable.set('panel', '**Panel**: ' + statusoffline)
        console.log(chalk.cyan('[live-stats@/events/ready.js:238] ') + chalk.red('Unable to reach Panel API, assuming system is down.'))
      }
      if (userCount === checking) paneltable.set('panel', '**Panel**: ' + checking)
      let panel = paneltable.get('panel') + '\n\nUsers: ' + userCount + '\nServers: ' + serverCount

      if (panel === null) panel = '**Panel**: ' + checking + '\n\nUsers: ' + userCount + '\nServers: ' + serverCount

      let nodes
      list.forEach((d) => {
        if (!nodes) return nodes = d
        nodes = nodes + d
      })

      console.log(chalk.cyan(['[live-stats@/events/ready.js:251] ']) + chalk.green(list.length + ' nodes connected.'))
      let nodeCount = '[Total ' + list.length + ']'

      if (debug === true) console.log(chalk.magenta('[live-stats@/events/ready.js:254] ') + chalk.blue(nodes))
      if (nodes === undefined) {
        nodes = checking + ' Please wait ' + time + ' seconds'
        console.log(chalk.cyan(['[live-stats@/events/ready.js:257] ']) + chalk.yellow(checking + ' Please wait ' + time + ' seconds'))
      }

      let embed = new MessageEmbed()
        .setTitle(title)
        .setColor(color)
        .addField('Panel Stats', panel)
        .setThumbnail(client.user.avatarURL())
      if (enablets === true) {
        embed.setTimestamp()
      }
      if (enabledesc === true) {
        embed.setDescription(desc + '\n**Nodes Stats' + nodeCount + '**\n' + nodes)
      } else {
        embed.setDescription('\n**Nodes Stats' + nodeCount + '**\n' + nodes)
      }

      let messages = await ch.messages.fetch({limit: 10})
      messages = messages.filter(m => m.author.id === client.user.id).last();
      if (messages == null) ch.send(embed)
      else messages.edit(embed)


      console.log(chalk.cyan('[live-stats@/events/ready.js:280] ') + chalk.green('Posted statistics to Discord.'))
      if (panel !== null) console.log(chalk.cyan('[live-stats@/events/ready.js:281] ') + chalk.green('Statistics have been updated.'))
      console.log(chalk.cyan('[PteroStats Checker] ') + chalk.green('Updating Stats in ' + time + ' Seconds'))

    }).catch((err) => {
      console.log(chalk.magenta('[live-stats@/events/ready.js:285] ') + chalk.red(err))
    })
  }, time + '000')
}
