import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "redis";

const publishClient = createClient();
publishClient.connect();

const subscribeClient = createClient();
subscribeClient.connect();

const userSockets = new WebSocketServer({ port: 8080 });

const subscriptions: {
  //* in memory object
  [key: string]: {
    ws: WebSocket;
    rooms: string[];
  };
} = {};

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
      subscriptions[id].rooms = subscriptions[id].rooms.filter(
        (room) => room != parsedMessage.room
      );

      if (lastPersonLeftRoom(parsedMessage.room)) {
        console.log(
          "un-subscribing on the pub sub to room " + parsedMessage.room
        );
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

      publishClient.publish(
        room,
        JSON.stringify({
          type: "sendMessage",
          room,
          message,
        })
      );
    }
  });
});

function randomId() {
  return Math.random(); //* any random number between 0 to 1
}

function oneUserSubscribedTo(room: string) {
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

function lastPersonLeftRoom(room: string) {
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
