export class RelayMessage {
  constructor(timestamp, type, data, topic) {
    this.timestamp = timestamp;
    this.type = type;
    this.data = data;
    this.topic = topic;
  }
}
export var RelayMessageType = /* @__PURE__ */ ((RelayMessageType2) => {
  RelayMessageType2["Transaction"] = "Transaction";
  RelayMessageType2["TransactionResponse"] = "TransactionResponse";
  RelayMessageType2["ApprovePairing"] = "ApprovePairing";
  RelayMessageType2["RejectPairing"] = "RejectPairing";
  RelayMessageType2["Acknowledge"] = "Acknowledge";
  RelayMessageType2["AdditionalAccountRequest"] = "AdditionalAccountRequest";
  RelayMessageType2["AdditionalAccountResponse"] = "AdditionalAccountResponse";
  RelayMessageType2["AuthenticationRequest"] = "AuthenticationRequest";
  RelayMessageType2["AuthenticationResponse"] = "AuthenticationResponse";
  RelayMessageType2["SigningRequest"] = "SigningRequest";
  RelayMessageType2["SigningResponse"] = "SigningResponse";
  return RelayMessageType2;
})(RelayMessageType || {});
