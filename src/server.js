import http from "http";
import SocketIo from "socket.io"
import express from "express";

const app=express();

app.set("view engine","pug")
app.set("views",__dirname + "/views")
app.use("/public", express.static(__dirname + "/public"))
app.get("/", (req, res)=> res.render("home"))

const handleListen=()=> console.log('Listening on http://localhost:3000')

const httpServer=http.createServer(app);
const wsServer=SocketIo(httpServer);


//sids는 개인방(개인 아이디)
//room은 개인방 공개방 전부 있다
//공개방만 얻기 위해서 rooms에서 sids를 뺀 것
function publicRooms(){
    const sids=wsServer.sockets.adapter.sids;
    const rooms=wsServer.sockets.adapter.rooms;
    
    const publicRooms=[];
    rooms.forEach((_, key)=>{
        if(sids.get(key)===undefined){
            publicRooms.push(key)
        }
    })
    return publicRooms
}

function countRoom(roomName){
    return wsServer.sockets.adapter.rooms.get(roomName)?.size
}


wsServer.on("connection",(socket)=>{
    socket["nickname"]="Anon"
    socket.onAny((event)=>{
        console.log(`Socket Event: ${event}`)
    })
    socket.on("enter_room", (roomName, done)=>{
        //console.log(socket.id)      //프라이버리 방 확인하기
        //console.log(socket.rooms)   //모든 방 확인하기
        socket.join(roomName)
        done()
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName)) //roomName의 모든 사용자에게 welcome event를 emit함
        wsServer.sockets.emit("room_change",publicRooms())   //우리서버안의 모든 소켓에 전달
    })
    socket.on("disconnecting", ()=>{
        socket.rooms.forEach(room=>{
            socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
        })
    })
    socket.on("disconnect", ()=>{
        wsServer.sockets.emit("room_change", publicRooms())
    })
    socket.on("new_message", (msg, room, done)=>{
        socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`)
        done();
    })
    socket.on("nickname", (nickname)=>socket["nickname"]=nickname)

})

httpServer.listen(3000, handleListen)