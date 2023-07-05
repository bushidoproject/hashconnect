import { v4 as uuidv4 } from "uuid";
import { RelayMessage } from ".//index.mjs";
import SimpleCrypto from "simple-crypto-js";
export class MessageUtil {
  // private proto = protons(`
  // message SimpleMessage {
  //     uint64 timestamp = 1;
  //     string type = 2;
  //     string data = 3;
  // }`);
  /**
   * Compiles the simple protobuf with the specified paramaters 
   * 
   * @param message message to prepare
   * @param type type of message
   * @returns protobuf message
   */
  async prepareSimpleMessage(type, data, topic, hc) {
    data.id = uuidv4();
    if (hc.debug)
      console.log("hashconnect - Sending message - id: " + data.id);
    const encryptedData = await this.encrypt(JSON.stringify(data), hc.encryptionKeys[data.topic], hc);
    const message = new RelayMessage(
      Date.now(),
      type,
      encryptedData,
      topic
      // JSON.stringify(data)
    );
    return JSON.stringify(message);
  }
  async decode(payload, hc) {
    if (hc.debug)
      console.log("hashconnect - decoding message payload");
    let parsedPayload = payload;
    if (typeof payload == "string")
      parsedPayload = JSON.parse(payload);
    const message = parsedPayload;
    message.data = await this.decrypt(message.data, hc.encryptionKeys[message.topic], hc);
    return message;
  }
  /**
   * Generate a random topic ID UUID 
   * 
   * @returns random UUID topic ID
   */
  createRandomTopicId() {
    return uuidv4();
  }
  async encrypt(string, key, hc) {
    if (hc.debug)
      console.log("hashconnect - encrypting with key: " + key);
    if (hc.debug)
      console.log("Topic key mapping", hc.encryptionKeys);
    const simpleCrypto = new SimpleCrypto(key);
    return simpleCrypto.encrypt(string);
  }
  async decrypt(string, key, hc) {
    if (hc.debug)
      console.log("hashconnect - decryption with key: " + key);
    const simpleCrypto = new SimpleCrypto(key);
    const text = simpleCrypto.decrypt(string);
    return text;
  }
}
