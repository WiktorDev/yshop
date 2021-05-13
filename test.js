const util = require('minecraft-server-util');

util.status('play.hypixel.net') // port is default 25565
    .then((response) => {
        console.log(response.onlinePlayers);
    })
    .catch((error) => {
        console.error(error);
    });