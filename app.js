//importing basic required modules
//I am using camelCasing over this whole application expect at some
//instances where I forget to use it. (pardon me for that!)
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

//required confriguration for application 
require('dotenv').config();
app.use(express.json());

//special confriguration for implementation of rabbitmq
const amqp = require('amqplib');
//we can set the url of rabbitmq in .env file or it will take localhost as default
//I'll configuring the startup process such that it will use the localhost as
//default url if the url is not provided in .env file
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
const logQueue = 'databaseEntries';



//task1 : writing data to rabbitmq from an post api
//Producer endpoint to send logs to RabbitMQ
app.post('/writeLog', async (req, res) => {
    const logEntry = req.body;

    //creating a connection to rabbitmq
    try {
        const connection = await amqp.connect(rabbitmqUrl);
        const channel = await connection.createChannel();

        //Ensuring that the queue exists
        //change the flag durable to true if you want to make the queue persistent
        //when the server restarts
        await channel.assertQueue(logQueue, { durable : false});

        //sending log entries to the queue
        channel.sendToQueue(logQueue, Buffer.from(JSON.stringify(logEntry)));

        //closing the connection to rabbitmq
        await channel.close();
        await connection.close();

        console.log("Log entry sent to queue successfully!", logEntry);
        res.status(200).send('Log entry sent to queue successfully!');
    } catch (error) {
        //handling errors
        console.error('Error sending log to RabbitMQ:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.listen(port, () => {
    console.log(`Server is up, and running over port ${port}!`);
});