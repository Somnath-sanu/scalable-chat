"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const redis_1 = require("redis");
const publishClient = (0, redis_1.createClient)();
publishClient.connect();
const subscribeClient = (0, redis_1.createClient)();
subscribeClient.connect();
const userSockets = new ws_1.WebSocketServer({ port: 8080 });
const subscriptions = {};
userSockets.on("connection", (userSocket) => {
    const id = randomId();
    subscriptions[id] = {
        ws: userSocket,
        rooms: [],
    };
    // setInterval(() => {
    //   console.log(subscriptions[id].rooms);
    // },3000)
    userSocket.on("message", (data) => {
        const parsedMessage = JSON.parse(data.toString());
        if (parsedMessage.type === "SUBSCRIBE") {
            subscriptions[id].rooms.push(parsedMessage.room);
            if (oneUserSubscribedTo(parsedMessage.room)) {
                console.log("subscribing on the pub sub to room " + parsedMessage.room);
                subscribeClient.subscribe(parsedMessage.room, (message) => {
                    const parsedMessage = JSON.parse(message);
                    Object.keys(subscriptions).forEach((userId) => {
                        const { ws, rooms } = subscriptions[userId];
                        if (rooms.includes(parsedMessage.room)) {
                            ws.send(parsedMessage.message);
                        }
                    });
                });
            }
        }
        if (parsedMessage.type === "UNSUBSCRIBE") {
            subscriptions[id].rooms = subscriptions[id].rooms.filter((room) => room != parsedMessage.room);
            if (lastPersonLeftRoom(parsedMessage.room)) {
                console.log("un-subscribing on the pub sub to room " + parsedMessage.room);
                subscribeClient.unsubscribe(parsedMessage.room);
            }
        }
        if (parsedMessage.type === "sendMessage") {
            const message = parsedMessage.message;
            const room = parsedMessage.room;
            // Object.keys(subscriptions).forEach((userId) => {
            //   const { ws, rooms } = subscriptions[userId];
            //   if (rooms.includes(room)) {
            //     ws.send(message);
            //   }
            // });
            publishClient.publish(room, JSON.stringify({
                type: "sendMessage",
                room,
                message,
            }));
        }
    });
});
function randomId() {
    return Math.random(); //* any random number between 0 to 1
}
function oneUserSubscribedTo(room) {
    let totalInterestedPeople = 0;
    Object.keys(subscriptions).map((userId) => {
        if (subscriptions[userId].rooms.includes(room)) {
            totalInterestedPeople++;
        }
    });
    if (totalInterestedPeople == 1) {
        return true;
    }
    return false; //* even if totalInterestedPeople is more than 1 return false , no need to re-subscribe
}
function lastPersonLeftRoom(room) {
    let totalInterestedPeople = 0;
    Object.keys(subscriptions).map((userId) => {
        if (subscriptions[userId].rooms.includes(room)) {
            totalInterestedPeople++;
        }
    });
    if (totalInterestedPeople == 0) {
        return true;
    }
    return false;
}
