const express = require('express');
const { Chess } = require('chess.js');
const socket = require('socket.io');
const http = require('http');
const path = require('path'); 

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess(); 

let players = {};
let currentPlayer = "W";
let playerNames = { white: null, black: null };

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render('index');
});

io.on("connection", function (uniquesocket) {
    console.log("Connected");

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.on("setName", function (name) {
        if (uniquesocket.id === players.white) {
            playerNames.white = name;
            io.to(players.black).emit("opponentName", name);
        } else if (uniquesocket.id === players.black) {
            playerNames.black = name;
            io.to(players.white).emit("opponentName", name);
        }
    });

    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id === players.white) {
            delete players.white;
            playerNames.white = null;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
            playerNames.black = null;
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            // Validate if the current player is allowed to make the move
            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move); 
                io.emit("boardState", chess.fen()); 
            } else {
                console.log("Invalid move: ", move);
                uniquesocket.emit("invalidMove", move); 
            }
        } catch (err) {
            console.log(err);
            console.log("Invalid move: ", move);
        }
    });
});

server.listen(3001, function () {
    console.log("Server is running...");
});