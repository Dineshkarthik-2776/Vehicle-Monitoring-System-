import mqtt from "mqtt";
import { handleIncomingData } from "../services/iotService.js";

const client = mqtt.connect("mqtt://eu1.cloud.thethings.network:1883", {
    username: process.env.TTN_USERNAME,
    password: process.env.TTN_PASSWORD
});

client.on("connect", () => {
    console.log("Connected to TTN MQTT");

        client.subscribe("v3/algps@ttn/devices/+/up", (err) => {
        if (err) {
            console.error("MQTT Subscribe Error:", err);
        } else {
            console.log("Subscribed to TTN topic");
        }
    });

});

client.on("message", async(topic, message) =>{
    try{
        const data = JSON.parse(message.toString());

        const payload = data?.uplink_message?.decoded_payload;

        if(!payload) return;

        const formatted = {
            pcb_id: payload.pcb_id,
            latitude: payload.latitude,
            longitude: payload.longitude,
            battery: payload.battery
        };

        console.log("Incoming: ", formatted);

        await handleIncomingData(formatted);

    }catch(e){
        console.error("Error processing MQTT message:", e);
    }
});
export default client