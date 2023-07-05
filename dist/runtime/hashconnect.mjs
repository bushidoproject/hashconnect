import { Event } from "ts-typed-events";
import { WebSocketRelay } from "./types/relay.mjs";
import { MessageUtil, MessageHandler, RelayMessageType } from "./message/index.mjs";
import { HashConnectConnectionState } from "./types/hashconnect.mjs";
import { HashConnectProvider } from "./provider/provider.mjs";
import { HashConnectSigner } from "./provider/signer.mjs";
global.Buffer = global.Buffer || require("buffer").Buffer;
export class HashConnect {
  constructor(debug) {
    this.encryptionKeys = {};
    //enc keys with topic id as the key
    this.debug = false;
    this.status = HashConnectConnectionState.Disconnected;
    //do we even need this?
    this.hcData = {
      topic: "",
      pairingString: "",
      encryptionKey: "",
      pairingData: []
    };
    this.relay = new WebSocketRelay(this);
    this.foundExtensionEvent = new Event();
    this.foundIframeEvent = new Event();
    this.pairingEvent = new Event();
    this.transactionEvent = new Event();
    this.acknowledgeMessageEvent = new Event();
    this.additionalAccountRequestEvent = new Event();
    this.connectionStatusChangeEvent = new Event();
    this.authRequestEvent = new Event();
    this.signRequestEvent = new Event();
    this.messages = new MessageUtil();
    this.messageParser = new MessageHandler();
    if (debug)
      this.debug = debug;
    this.setupEvents();
  }
  async init(metadata, network, singleAccount = true) {
    return new Promise(async (resolve) => {
      const initData = {
        topic: "",
        pairingString: "",
        encryptionKey: "",
        savedPairings: []
      };
      this.metadata = metadata;
      if (this.debug)
        console.log("hashconnect - Initializing");
      if (typeof window !== "undefined") {
        this.metadata.url = window.location.origin;
      } else if (!metadata.url) {
        throw new Error("metadata.url must be defined if not running hashconnect within a browser");
      }
      await this.relay.init();
      if (this.debug)
        console.log("hashconnect - Initialized");
      if (!this.loadLocalData()) {
        if (this.debug)
          console.log("hashconnect - No local data found, initializing");
        this.hcData.encryptionKey = await this.generateEncryptionKeys();
        this.metadata.encryptionKey = this.hcData.encryptionKey;
        initData.encryptionKey = this.hcData.encryptionKey;
        const topic = await this.connect();
        if (this.debug)
          console.log("hashconnect - Received state", topic);
        this.hcData.topic = topic;
        initData.topic = topic;
        this.hcData.pairingString = this.generatePairingString(topic, network, !singleAccount);
        initData.pairingString = this.hcData.pairingString;
        this.saveDataInLocalstorage();
        this.status = HashConnectConnectionState.Connected;
        this.connectionStatusChangeEvent.emit(HashConnectConnectionState.Connected);
      } else {
        if (this.debug)
          console.log("hashconnect - Found saved local data", this.hcData);
        this.metadata.encryptionKey = this.hcData.encryptionKey;
        this.status = HashConnectConnectionState.Connecting;
        this.connectionStatusChangeEvent.emit(HashConnectConnectionState.Connecting);
        initData.pairingString = this.hcData.pairingString;
        initData.topic = this.hcData.topic;
        initData.encryptionKey = this.hcData.encryptionKey;
        initData.savedPairings = this.hcData.pairingData;
        this.connect(initData.topic, this.metadata, initData.encryptionKey);
        this.status = HashConnectConnectionState.Connected;
        this.connectionStatusChangeEvent.emit(HashConnectConnectionState.Connected);
        for (const pairing of this.hcData.pairingData) {
          await this.connect(pairing.topic, pairing.metadata, pairing.encryptionKey);
        }
        if (this.hcData.pairingData.length > 0) {
          this.status = HashConnectConnectionState.Paired;
          this.connectionStatusChangeEvent.emit(HashConnectConnectionState.Paired);
        }
      }
      if (this.debug)
        console.log("hashconnect - init data", initData);
      this.findLocalWallets();
      resolve(initData);
    });
  }
  async connect(topic, metadataToConnect, encryptionKey) {
    if (!topic) {
      topic = this.messages.createRandomTopicId();
      this.encryptionKeys[topic] = this.hcData.encryptionKey;
      if (this.debug)
        console.log("hashconnect - Created new topic id - " + topic);
    }
    if (metadataToConnect) {
      this.encryptionKeys[topic] = encryptionKey;
    }
    await this.relay.subscribe(topic);
    return topic;
  }
  async disconnect(topic) {
    if (topic != this.hcData.topic)
      await this.relay.unsubscribe(topic);
    const index = this.hcData.pairingData.findIndex((pairing) => pairing.topic == topic);
    this.hcData.pairingData.splice(index, 1);
    if (this.hcData.pairingData.length == 0) {
      this.status = HashConnectConnectionState.Connected;
      this.connectionStatusChangeEvent.emit(HashConnectConnectionState.Connected);
    }
    this.saveDataInLocalstorage();
  }
  /**
   * Set up event connections
   */
  setupEvents() {
    if (this.debug)
      console.log("hashconnect - Setting up events");
    this.relay.payload.on(async (payload) => {
      if (!payload)
        return;
      const message = await this.messages.decode(payload, this);
      await this.messageParser.onPayload(message, this);
    });
    this.pairingEvent.on((pairingEvent) => {
      this.hcData.pairingData.push(pairingEvent.pairingData);
      this.saveDataInLocalstorage();
    });
    this.foundIframeEvent.on((walletMetadata) => {
      if (this.debug)
        console.log("hashconnect - Found iframe wallet", walletMetadata);
      this.connectToIframeParent();
    });
  }
  /**
   * Local data management
   */
  saveDataInLocalstorage() {
    if (typeof window === "undefined" || typeof localStorage === "undefined")
      return;
    const data = JSON.stringify(this.hcData);
    if (this.debug)
      console.log("hashconnect - saving local data", this.hcData);
    localStorage.setItem("hashconnectData", data);
  }
  loadLocalData() {
    if (typeof window === "undefined" || typeof localStorage === "undefined")
      return false;
    const foundData = localStorage.getItem("hashconnectData");
    if (foundData) {
      const data = JSON.parse(foundData);
      if (!data.pairingData || !data.encryptionKey) {
        if (this.debug)
          console.log("hashconnect - legacy save data found, creating new data");
        return false;
      }
      this.hcData = data;
      return true;
    } else
      return false;
  }
  async clearConnectionsAndData() {
    if (this.debug)
      console.log("hashconnect - clearing local data - you will need to run init() again");
    for (const pairing of this.hcData.pairingData) {
      await this.relay.unsubscribe(pairing.topic);
    }
    this.hcData = {
      topic: "",
      pairingString: "",
      encryptionKey: "",
      pairingData: []
    };
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("hashconnectData");
    }
    this.status = HashConnectConnectionState.Disconnected;
    this.connectionStatusChangeEvent.emit(HashConnectConnectionState.Disconnected);
  }
  /**
   * Send functions
   */
  async sendTransaction(topic, transaction) {
    transaction.byteArray = Buffer.from(transaction.byteArray).toString("base64");
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.Transaction, transaction, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    this.sendEncryptedLocalTransaction(msg);
    return await new Promise((resolve) => this.transactionResolver = resolve);
  }
  async requestAdditionalAccounts(topic, message) {
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.AdditionalAccountRequest, message, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    return await new Promise((resolve) => this.additionalAccountResolver = resolve);
  }
  async sendAdditionalAccounts(topic, message) {
    message.accountIds = message.accountIds.map((id) => {
      return id;
    });
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.AdditionalAccountResponse, message, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    return message.id;
  }
  async sendTransactionResponse(topic, message) {
    if (message.receipt)
      message.receipt = Buffer.from(message.receipt).toString("base64");
    if (message.signedTransaction)
      message.signedTransaction = Buffer.from(message.signedTransaction).toString("base64");
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.TransactionResponse, message, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    return message.id;
  }
  async pair(pairingData, accounts, network) {
    if (this.debug)
      console.log("hashconnect - Pairing to " + pairingData.metadata.name);
    await this.connect(pairingData.topic);
    const msg = {
      metadata: this.metadata,
      topic: pairingData.topic,
      accountIds: accounts,
      network
    };
    const newPairingData = {
      accountIds: msg.accountIds,
      metadata: pairingData.metadata,
      network: msg.network,
      topic: msg.topic,
      origin: msg.origin,
      lastUsed: (/* @__PURE__ */ new Date()).getTime(),
      encryptionKey: pairingData.metadata.encryptionKey || pairingData.metadata.publicKey
    };
    this.hcData.pairingData.push(newPairingData);
    this.saveDataInLocalstorage();
    if (newPairingData.metadata.publicKey) {
      msg.metadata.publicKey = newPairingData.metadata.publicKey;
    }
    msg.metadata.description = this.sanitizeString(msg.metadata.description);
    msg.metadata.name = this.sanitizeString(msg.metadata.name);
    msg.network = this.sanitizeString(msg.network);
    msg.metadata.url = this.sanitizeString(msg.metadata.url);
    msg.accountIds = msg.accountIds.map((id) => {
      return id;
    });
    if (pairingData.metadata.encryptionKey)
      msg.metadata.encryptionKey = pairingData.metadata.encryptionKey;
    this.encryptionKeys[pairingData.topic] = pairingData.metadata.encryptionKey;
    if (pairingData.metadata.publicKey)
      this.encryptionKeys[pairingData.topic] = pairingData.metadata.publicKey;
    const payload = await this.messages.prepareSimpleMessage(RelayMessageType.ApprovePairing, msg, msg.topic, this);
    this.relay.publish(pairingData.topic, payload, this.encryptionKeys[pairingData.topic]);
    return newPairingData;
  }
  async reject(topic, reason, msg_id) {
    const reject = {
      reason,
      topic,
      msg_id
    };
    reject.reason = this.sanitizeString(reject.reason);
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.RejectPairing, reject, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
  }
  async acknowledge(topic, pubKey, msg_id) {
    const ack = {
      result: true,
      topic,
      msg_id
    };
    const ackPayload = await this.messages.prepareSimpleMessage(RelayMessageType.Acknowledge, ack, topic, this);
    await this.relay.publish(topic, ackPayload, pubKey);
  }
  /**
   * Authenticate
   */
  async authenticate(topic, account_id, server_signing_account, serverSignature, payload) {
    const message = {
      topic,
      accountToSign: account_id,
      serverSigningAccount: server_signing_account,
      serverSignature,
      payload
    };
    message.serverSignature = Buffer.from(message.serverSignature).toString("base64");
    console.log(message.serverSignature);
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.AuthenticationRequest, message, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    this.sendEncryptedLocalTransaction(msg);
    return await new Promise((resolve) => this.authResolver = resolve);
  }
  async sendAuthenticationResponse(topic, message) {
    if (message.userSignature)
      message.userSignature = Buffer.from(message.userSignature).toString("base64");
    if (message.signedPayload)
      message.signedPayload.serverSignature = Buffer.from(message.signedPayload.serverSignature).toString("base64");
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.AuthenticationResponse, message, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    return message.id;
  }
  /**
   * Generic Signing
   */
  async sign(topic, account_id, payload) {
    const message = {
      topic,
      accountToSign: account_id,
      payload
    };
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.SigningRequest, message, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    this.sendEncryptedLocalTransaction(msg);
    return await new Promise((resolve) => this.signResolver = resolve);
  }
  async sendSigningResponse(topic, message) {
    if (message.userSignature)
      message.userSignature = Buffer.from(message.userSignature).toString("base64");
    const msg = await this.messages.prepareSimpleMessage(RelayMessageType.SigningResponse, message, topic, this);
    await this.relay.publish(topic, msg, this.encryptionKeys[topic]);
    return message.id;
  }
  /**
   * Helpers
   */
  generatePairingString(topic, network, multiAccount) {
    if (this.debug)
      console.log("hashconnect - Generating pairing string");
    const data = {
      metadata: this.metadata,
      topic,
      network,
      multiAccount
    };
    data.metadata.description = this.sanitizeString(data.metadata.description);
    data.metadata.name = this.sanitizeString(data.metadata.name);
    data.network = this.sanitizeString(data.network);
    data.metadata.url = this.sanitizeString(data.metadata.url);
    const pairingString = Buffer.from(JSON.stringify(data)).toString("base64");
    this.hcData.pairingString = pairingString;
    return pairingString;
  }
  decodePairingString(pairingString) {
    const json_string = Buffer.from(pairingString, "base64").toString();
    const data = JSON.parse(json_string);
    return data;
  }
  async generateEncryptionKeys() {
    const key = this.messages.createRandomTopicId();
    if (this.debug)
      console.log("hashconnect - Generated new encryption key - " + key);
    return key;
  }
  sanitizeString(str) {
    if (!str)
      return "";
    return str.replace(/[^\w. ]/gi, function(c) {
      if (c == ".")
        return ".";
      return "&#" + c.charCodeAt(0) + ";";
    });
  }
  /**
   * Local wallet stuff
   */
  findLocalWallets() {
    if (typeof window === "undefined") {
      if (this.debug)
        console.log("hashconnect - Cancel findLocalWallets - no window object");
      return;
    }
    if (this.debug)
      console.log("hashconnect - Finding local wallets");
    window.addEventListener("message", (event) => {
      if (event.data.type && event.data.type == "hashconnect-query-extension-response") {
        if (this.debug)
          console.log("hashconnect - Local wallet metadata recieved", event.data);
        if (event.data.metadata)
          this.foundExtensionEvent.emit(event.data.metadata);
      }
      if (event.data.type && event.data.type == "hashconnect-iframe-response") {
        if (this.debug)
          console.log("hashconnect - iFrame wallet metadata recieved", event.data);
        if (event.data.metadata)
          this.foundIframeEvent.emit(event.data.metadata);
      }
    }, false);
    setTimeout(() => {
      window.postMessage({ type: "hashconnect-query-extension" }, "*");
      if (window.parent)
        window.parent.postMessage({ type: "hashconnect-iframe-query" }, "*");
    }, 50);
  }
  connectToIframeParent() {
    if (typeof window === "undefined") {
      if (this.debug)
        console.log("hashconnect - Cancel iframe connection - no window object");
      return;
    }
    if (this.debug)
      console.log("hashconnect - Connecting to iframe parent wallet");
    window.parent.postMessage({ type: "hashconnect-iframe-pairing", pairingString: this.hcData.pairingString }, "*");
  }
  connectToLocalWallet() {
    if (typeof window === "undefined") {
      if (this.debug)
        console.log("hashconnect - Cancel connect to local wallet - no window object");
      return;
    }
    if (this.debug)
      console.log("hashconnect - Connecting to local wallet");
    window.postMessage({ type: "hashconnect-connect-extension", pairingString: this.hcData.pairingString }, "*");
  }
  sendEncryptedLocalTransaction(message) {
    if (typeof window === "undefined") {
      if (this.debug)
        console.log("hashconnect - Cancel send local transaction - no window object");
      return;
    }
    if (this.debug)
      console.log("hashconnect - sending local transaction", message);
    window.postMessage({ type: "hashconnect-send-local-transaction", message }, "*");
  }
  async decodeLocalTransaction(message) {
    const local_message = await this.messages.decode(message, this);
    return local_message;
  }
  /**
   * Provider stuff
   */
  getProvider(network, topicId, accountToSign) {
    return new HashConnectProvider(network, this, topicId, accountToSign);
  }
  getSigner(provider) {
    return new HashConnectSigner(this, provider, provider.accountToSign, provider.topicId);
  }
  getPairingByTopic(topic) {
    const pairingData = this.hcData.pairingData.find((pairing) => {
      return pairing.topic == topic;
    });
    if (!pairingData) {
      return null;
    }
    return pairingData;
  }
}
