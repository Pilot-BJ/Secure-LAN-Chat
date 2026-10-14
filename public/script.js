const socket = io();

// Shared AES key
const SECRET_KEY = "ComputerNetworkSecurity2026";

// Received encrypted messages
const encryptedMessages = {};

// Messages sent by this client
const outgoingMessages = {};


// ========================================
// SERVER INFORMATION
// ========================================

socket.on("server-info", (data) => {

    document.getElementById("serverIP").innerText =
        data.ip;

});


// ========================================
// CLIENT COUNT
// ========================================

socket.on("client-count", (count) => {

    document.getElementById("clientCount").innerText =
        count;

});


// ========================================
// SEND MESSAGE
// ========================================

function sendMessage() {

    const input =
        document.getElementById("messageInput");

    const status =
        document.getElementById("deliveryStatus");

    const message =
        input.value.trim();

    if (message === "") {
        return;
    }


    // Show encryption status

    status.className =
        "delivery-status sending";

    status.innerText =
        "🔐 Encrypting message...";


    // AES Encryption

    const encrypted =
        CryptoJS.AES.encrypt(
            message,
            SECRET_KEY
        ).toString();


    // Show sending status

    status.className =
        "delivery-status sent";

    status.innerText =
        "📡 Sending encrypted message to server...";


    // Send encrypted message to server

    socket.emit(
        "encrypted-message",
        {
            encrypted: encrypted
        }
    );


    // Clear input

    input.value = "";

}


// ========================================
// MESSAGE STATUS
// ========================================

socket.on("message-status", (data) => {

    const status =
        document.getElementById("deliveryStatus");


    // ====================================
    // MESSAGE SENT TO SERVER
    // ====================================

    if (data.status === "sent") {

        // Remember that THIS client sent it

        outgoingMessages[data.messageId] = true;

        status.className =
            "delivery-status sent";

        status.innerText =
            "✓ Sent to Server — Waiting for receiver";

        return;
    }


    // ====================================
    // MESSAGE DELIVERED
    // ====================================

    if (data.status === "delivered") {

        /*
         * IMPORTANT:
         *
         * Only show delivery confirmation
         * if this client originally sent
         * the message.
         */

        if (
            !outgoingMessages[data.messageId]
        ) {

            console.log(
                "Ignoring delivery status. This client is not the sender."
            );

            return;
        }


        status.className =
            "delivery-status delivered";

        status.innerText =
            "✓ " + data.message;


        // Remove from outgoing list

        delete outgoingMessages[
            data.messageId
        ];

        return;
    }


    // ====================================
    // MESSAGE FAILED
    // ====================================

    if (data.status === "failed") {

        status.className =
            "delivery-status failed";

        status.innerText =
            "✕ Message not delivered — " +
            data.message;

        return;
    }

});


// ========================================
// RECEIVE ENCRYPTED MESSAGE
// ========================================

socket.on(
    "encrypted-message",
    (data) => {

        const messages =
            document.getElementById("messages");


        // Remove welcome message

        const welcome =
            document.querySelector(
                ".welcome-message"
            );

        if (welcome) {
            welcome.remove();
        }


        // Store encrypted message

        const messageId =
            data.messageId;

        encryptedMessages[messageId] = {

            encrypted:
                data.encrypted,

            sender:
                data.sender

        };


        // Create message box

        const messageBox =
            document.createElement("div");

        messageBox.className =
            "message";


        messageBox.innerHTML = `

            <strong>
                🔐 ENCRYPTED MESSAGE FROM
                ${data.sender}
            </strong>

            <p class="cipher-text">
                ${data.encrypted}
            </p>

            <button
                class="decrypt-button"
                onclick="decryptMessage('${messageId}', this)"
            >
                🔓 CLICK TO DECRYPT
            </button>

        `;


        messages.appendChild(
            messageBox
        );


        // Scroll to latest message

        messages.scrollTop =
            messages.scrollHeight;


        // Tell server that receiver
        // received the encrypted packet

        console.log(
            "Sending delivery acknowledgement:",
            messageId
        );


        socket.emit(
            "message-delivered",
            {
                messageId:
                    messageId
            }
        );

    }
);


// ========================================
// DECRYPT MESSAGE
// ========================================

function decryptMessage(
    messageId,
    button
) {

    const messageData =
        encryptedMessages[messageId];


    if (!messageData) {
        return;
    }


    const encrypted =
        messageData.encrypted;

    const sender =
        messageData.sender;


    // AES Decryption

    const decryptedBytes =
        CryptoJS.AES.decrypt(
            encrypted,
            SECRET_KEY
        );


    const decrypted =
        decryptedBytes.toString(
            CryptoJS.enc.Utf8
        );


    // Check decryption

    if (!decrypted) {

        alert(
            "Decryption failed. Invalid key or message."
        );

        return;
    }


    // Replace encrypted message
    // with decrypted message

    const messageBox =
        button.parentElement;


    messageBox.innerHTML = `

        <strong>
            🔓 DECRYPTED MESSAGE FROM
            ${sender}
        </strong>

        <p class="decrypted-text">
            ${decrypted}
        </p>

        <small>
            ✓ AES Decryption Successful
        </small>

    `;

}


// ========================================
// ENTER KEY
// ========================================

document
    .getElementById("messageInput")
    .addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                sendMessage();

            }

        }
    );