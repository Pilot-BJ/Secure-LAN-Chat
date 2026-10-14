const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 5000;


// ========================================
// DATA STORAGE
// ========================================

// Currently connected clients
const clients = new Map();

// Messages waiting for delivery acknowledgement
const pendingMessages = new Map();


// Serve frontend
app.use(express.static("public"));


// ========================================
// GET LOCAL IP
// ========================================

function getLocalIP() {

    const interfaces = os.networkInterfaces();

    for (const interfaceName in interfaces) {

        const networks = interfaces[interfaceName];

        for (const network of networks) {

            if (
                network.family === "IPv4" &&
                !network.internal
            ) {

                return network.address;

            }

        }

    }

    return "127.0.0.1";
}


const localIP = getLocalIP();


// ========================================
// GET CLIENT NAME
// ========================================

function getClientName() {

    const usedNames = new Set(
        [...clients.values()].map(
            client => client.name
        )
    );


    const names = [
        "Client A",
        "Client B"
    ];


    for (const name of names) {

        if (!usedNames.has(name)) {

            return name;

        }

    }


    return null;
}


// ========================================
// UPDATE CLIENT COUNT
// ========================================

function updateClientCount() {

    io.emit(
        "client-count",
        clients.size
    );

}


// ========================================
// SERVER START
// ========================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "          🔐 SECURE LAN SERVER"
        );

        console.log(
            "========================================"
        );

        console.log(
            "SERVER STATUS : ONLINE"
        );

        console.log(
            "PORT          :",
            PORT
        );

        console.log(
            "LOCAL IP      :",
            localIP
        );

        console.log(
            "ACCESS URL    :",
            `http://${localIP}:${PORT}`
        );

        console.log(
            "========================================"
        );

        console.log(
            "Waiting for secure clients..."
        );

        console.log("");

    }
);


// ========================================
// CLIENT CONNECTION
// ========================================

io.on(
    "connection",
    (socket) => {

        // ------------------------------------
        // ASSIGN CLIENT NAME
        // ------------------------------------

        const clientName =
            getClientName();


        // ------------------------------------
        // ONLY ALLOW CLIENT A AND CLIENT B
        // ------------------------------------

        if (!clientName) {

            console.log("");

            console.log(
                "⚠ CONNECTION REJECTED"
            );

            console.log(
                "Reason : Only Client A and Client B are allowed."
            );

            socket.emit(
                "connection-error",
                {
                    message:
                        "Server already has Client A and Client B connected."
                }
            );

            socket.disconnect(true);

            return;
        }


        // ------------------------------------
        // STORE CLIENT
        // ------------------------------------

        clients.set(
            socket.id,
            {
                name: clientName,
                ip: socket.handshake.address
            }
        );


        // ------------------------------------
        // CLIENT CONNECTED
        // ------------------------------------

        console.log("");

        console.log(
            "----------------------------------------"
        );

        console.log(
            "🟢 CLIENT CONNECTED"
        );

        console.log(
            "----------------------------------------"
        );

        console.log(
            "Client Name :",
            clientName
        );

        console.log(
            "Socket ID   :",
            socket.id
        );

        console.log(
            "IP Address  :",
            socket.handshake.address
        );

        console.log(
            "Total Users :",
            clients.size
        );

        console.log(
            "----------------------------------------"
        );


        // ------------------------------------
        // SEND SERVER INFORMATION
        // ------------------------------------

        socket.emit(
            "server-info",
            {
                ip: localIP,
                port: PORT,
                clientName: clientName
            }
        );


        // ------------------------------------
        // UPDATE CLIENT COUNT
        // ------------------------------------

        updateClientCount();


        // ====================================
        // RECEIVE ENCRYPTED MESSAGE
        // ====================================

        socket.on(
            "encrypted-message",
            (data) => {

                // --------------------------------
                // GET SENDER
                // --------------------------------

                const sender =
                    clients.get(socket.id);


                if (!sender) {

                    return;

                }


                const senderName =
                    sender.name;


                // --------------------------------
                // GENERATE MESSAGE ID
                // --------------------------------

                const messageId =
                    Date.now().toString() +
                    "_" +
                    Math.random()
                        .toString(36)
                        .substring(2, 8);


                console.log("");

                console.log(
                    "========================================"
                );

                console.log(
                    "       🔐 ENCRYPTED PACKET"
                );

                console.log(
                    "========================================"
                );

                console.log(
                    "Message ID   :",
                    messageId
                );

                console.log(
                    "Sender       :",
                    senderName
                );

                console.log(
                    "Algorithm    : AES"
                );


                // --------------------------------
                // FIND THE OTHER CLIENT
                // --------------------------------

                const receiverEntry =
                    [...clients.entries()]
                        .find(
                            ([id]) =>
                                id !== socket.id
                        );


                // --------------------------------
                // NO RECEIVER
                // --------------------------------

                if (!receiverEntry) {

                    console.log(
                        "Transmission : FAILED"
                    );

                    console.log(
                        "Reason       : Receiver not connected"
                    );

                    console.log("");

                    console.log(
                        "⚠ SERVER CANNOT READ PLAINTEXT"
                    );

                    console.log(
                        "========================================"
                    );


                    // Tell ONLY sender

                    socket.emit(
                        "message-status",
                        {
                            messageId:
                                messageId,

                            status:
                                "failed",

                            message:
                                "Receiver is not connected"
                        }
                    );


                    return;
                }


                // --------------------------------
                // GET RECEIVER
                // --------------------------------

                const receiverId =
                    receiverEntry[0];

                const receiverClient =
                    receiverEntry[1];

                const receiverName =
                    receiverClient.name;


                // --------------------------------
                // STORE MESSAGE
                // --------------------------------

                pendingMessages.set(
                    messageId,
                    {

                        senderId:
                            socket.id,

                        senderName:
                            senderName,

                        receiverId:
                            receiverId,

                        receiverName:
                            receiverName,

                        encrypted:
                            data.encrypted

                    }
                );


                // --------------------------------
                // SEND ENCRYPTED MESSAGE
                // TO RECEIVER ONLY
                // --------------------------------

                io.to(
                    receiverId
                ).emit(
                    "encrypted-message",
                    {

                        messageId:
                            messageId,

                        sender:
                            senderName,

                        encrypted:
                            data.encrypted

                    }
                );


                // --------------------------------
                // SERVER LOG
                // --------------------------------

                console.log(
                    "Transmission : SUCCESS"
                );

                console.log(
                    "Receiver     :",
                    receiverName
                );

                console.log("");

                console.log(
                    "Ciphertext:"
                );

                console.log(
                    data.encrypted
                );

                console.log("");

                console.log(
                    "⚠ SERVER CANNOT READ PLAINTEXT"
                );

                console.log(
                    "========================================"
                );

                console.log("");


                // --------------------------------
                // TELL ONLY SENDER
                // PACKET REACHED SERVER
                // --------------------------------

                socket.emit(
                    "message-status",
                    {

                        messageId:
                            messageId,

                        status:
                            "sent",

                        message:
                            "Encrypted message sent to server"

                    }
                );

            }
        );


        // ====================================
        // DELIVERY ACKNOWLEDGEMENT
        // ====================================

        socket.on(
            "message-delivered",
            (data) => {

                console.log("");

                console.log(
                    "📩 DELIVERY ACK RECEIVED"
                );

                console.log(
                    "Message ID :",
                    data.messageId
                );


                // --------------------------------
                // FIND MESSAGE
                // --------------------------------

                const message =
                    pendingMessages.get(
                        data.messageId
                    );


                if (!message) {

                    console.log(
                        "⚠ Message not found"
                    );

                    return;

                }


                // --------------------------------
                // VERIFY RECEIVER
                // --------------------------------

                if (
                    message.receiverId !==
                    socket.id
                ) {

                    console.log(
                        "⚠ Invalid acknowledgement"
                    );

                    return;

                }


                // --------------------------------
                // DELIVERY SUCCESS
                // --------------------------------

                console.log(
                    "----------------------------------------"
                );

                console.log(
                    "✓ MESSAGE DELIVERED"
                );

                console.log(
                    "----------------------------------------"
                );

                console.log(
                    "Sender   :",
                    message.senderName
                );

                console.log(
                    "Receiver :",
                    message.receiverName
                );

                console.log(
                    "Status   : DELIVERED"
                );

                console.log(
                    "----------------------------------------"
                );


                // ====================================
                // IMPORTANT
                // SEND STATUS ONLY TO ORIGINAL SENDER
                // ====================================

                io.to(
                    message.senderId
                ).emit(
                    "message-status",
                    {

                        messageId:
                            data.messageId,

                        status:
                            "delivered",

                        message:
                            `Delivered to ${message.receiverName}`

                    }
                );


                // --------------------------------
                // REMOVE PENDING MESSAGE
                // --------------------------------

                pendingMessages.delete(
                    data.messageId
                );

            }
        );


        // ====================================
        // CLIENT DISCONNECT
        // ====================================

        socket.on(
            "disconnect",
            (reason) => {

                const client =
                    clients.get(socket.id);


                const clientName =
                    client
                        ? client.name
                        : "Unknown Client";


                // Remove client

                clients.delete(
                    socket.id
                );


                console.log("");

                console.log(
                    "----------------------------------------"
                );

                console.log(
                    "🔴 CLIENT DISCONNECTED"
                );

                console.log(
                    "----------------------------------------"
                );

                console.log(
                    "Client Name :",
                    clientName
                );

                console.log(
                    "Socket ID   :",
                    socket.id
                );

                console.log(
                    "Reason      :",
                    reason
                );

                console.log(
                    "Total Users :",
                    clients.size
                );

                console.log(
                    "----------------------------------------"
                );


                // Update count

                updateClientCount();

            }
        );

    }
);