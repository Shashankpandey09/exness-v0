import WebSocket ,{ WebSocketServer }from "ws"; 
import { createClient } from "redis";
//create websocket server that listens on port 8080
const wss=new WebSocketServer({port:8080}) 
// create client set for connections 
const client:Set<WebSocket>=new Set();
//create a redis client 
const socket_client=createClient();

wss.on('connection',(ws:WebSocket)=>{
    client.add(ws)
  
ws.on('close', () => {
        console.log('Client disconnected');
        // Remove THIS specific client when THEY disconnect
        client.delete(ws);
        console.log(`Remaining clients: ${client.size}`);
    });
})
//Websocket server error
wss.on('error',(err:Error)=>console.error(err))

async function SendToFrontend(){
    try {
 await socket_client.connect()
 await socket_client.subscribe('ask_bid',(msg)=>{
  //send it to the client
  console.log('msg--->',msg)
    client.forEach((client)=>{
        if(client&&client.readyState===WebSocket.OPEN)
            client.send(msg)
    })
 })
  console.log('socketClient connected');
    } catch (error) {
        console.log('error while connection');
    }
  
}
 SendToFrontend()



