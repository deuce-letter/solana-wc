import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  PendingProposal,
  PendingSignRequest,
  ServerToClientEvents,
  WcSessionSummary,
} from "@solana-wc/shared/socket";

export type SocketStatus = "disconnected" | "connecting" | "connected";
export type PendingApproval =
  | { type: "request"; value: PendingSignRequest }
  | { type: "proposal"; value: PendingProposal };

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type LogDirection = "SYSTEM" | "SEND" | "RECV";

function approvalKey(approval: PendingApproval): string {
  return `${approval.type}:${approval.value.id}`;
}

export function useWalletSocket() {
  const socketRef = useRef<AppSocket | null>(null);

  const [serverHost, setServerHost] = useState("localhost");
  const [serverPort, setServerPort] = useState("3001");
  const [serverUrl, setServerUrl] = useState("http://localhost:3001");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [address, setAddress] = useState("");

  const [sessions, setSessions] = useState<WcSessionSummary[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [pairingMessage, setPairingMessage] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = useCallback(
    (direction: LogDirection, event: string, data?: unknown) => {
      const time = new Date().toLocaleTimeString();
      const body =
        data === undefined
          ? ""
          : `\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}`;
      const entry = `[${time}] ${direction} ${event}${body}`;
      setLogs((current) => [...current, entry].slice(-300));
    },
    [],
  );

  useEffect(() => {
    const socket: AppSocket = io(serverUrl, {
      autoConnect: false,
      reconnection: false,
      timeout: 5000,
    });

    socketRef.current = socket;
    socket.on("connect", () => {
      setStatus("connected");
      setError("");
      appendLog("SYSTEM", "connect", { socketId: socket.id });
    });
    socket.on("connect_error", (err) => {
      setStatus("disconnected");
      setSessions([]);
      setError(`サーバーに接続できませんでした: ${err.message}`);
      appendLog("SYSTEM", "connect_error", err.message);
    });
    socket.on("disconnect", (reason) => {
      setStatus("disconnected");
      setSessions([]);
      setApprovals([]);
      setAddress("")
      appendLog("SYSTEM", "disconnect", reason);
    });
    socket.on("wallet:address", (address) => {
      setAddress(address || "");
      appendLog("RECV", "wallet:address", address);
    });
    socket.on("wc:sessions", (nextSessions) => {
      setSessions(nextSessions);
      appendLog("RECV", "wc:sessions", nextSessions);
    });
    socket.on("wc:session_request", (request) => {
      appendLog("RECV", "wc:session_request", request);
      setApprovals((current) => {
        const approval: PendingApproval = { type: "request", value: request };
        return current.some((item) => approvalKey(item) === approvalKey(approval))
          ? current
          : [...current, approval];
      });
    });
    socket.on("wc:session_proposal", (proposal) => {
      appendLog("RECV", "wc:session_proposal", proposal);
      setPairingMessage("");
      setApprovals((current) => {
        const approval: PendingApproval = { type: "proposal", value: proposal };
        return current.some((item) => approvalKey(item) === approvalKey(approval))
          ? current
          : [...current, approval];
      });
    });

    socket.connect();

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [appendLog, serverUrl, connectionAttempt]);

  function applyServerAddress() {
    setError("");

    const portText = serverPort.trim();
    const port = Number(portText);
    if (
      !/^\d+$/.test(portText) ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      setError("ポート番号は1〜65535の整数で入力してください。");
      return;
    }

    const nextServerUrl = `http://${serverHost}:${port}`;
    if (nextServerUrl !== serverUrl) {
      setApprovals([]);
    }
    setSessions([]);
    setStatus("connecting");
    setServerUrl(nextServerUrl);
    setConnectionAttempt((attempt) => attempt + 1);
  }

  function reconnect() {
    setSessions([]);
    setStatus("connecting");
    setConnectionAttempt((attempt) => attempt + 1);
  }

  function pairWithUri(input: string): boolean {
    setError("");
    setPairingMessage("");

    const uri = input.trim();
    if (!uri) {
      setError("WalletConnect URIを入力してください。");
      return false;
    }

    const socket = socketRef.current;
    if (!socket?.connected) {
      setError("サーバーに接続してからペアリングしてください。");
      return false;
    }

    socket.emit("wc:pair", uri);
    appendLog("SEND", "wc:pair", { uri: "[redacted]" });
    setPairingMessage("URIを送信しました。接続要求を待っています。");
    return true;
  }

  function decideApproval(approved: boolean) {
    const activeApproval = approvals[0];
    if (!activeApproval) return;

    const socket = socketRef.current;
    if (!socket?.connected) {
      setError("サーバーに接続されていません。再接続してください。");
      return;
    }

    if (activeApproval.type === "request") {
      const event = approved ? "wc:approve_request" : "wc:reject_request";
      socket.emit(event, activeApproval.value.id);
      appendLog("SEND", event, activeApproval.value.id);
    } else {
      const event = approved ? "wc:approve_proposal" : "wc:reject_proposal";
      socket.emit(event, activeApproval.value.id);
      appendLog("SEND", event, activeApproval.value.id);
    }

    const resolvedKey = approvalKey(activeApproval);
    setApprovals((current) =>
      current.filter((approval) => approvalKey(approval) !== resolvedKey),
    );
    setError("");
  }

  function disconnectSession(topic: string) {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError("サーバーに接続されていません。再接続してください。");
      return;
    }

    socket.emit("wc:disconnect", topic);
    appendLog("SEND", "wc:disconnect", topic);
  }

  return {
    address,
    status,
    serverHost,
    setServerHost,
    serverPort,
    setServerPort,
    serverUrl,
    sessions,
    approvals,
    activeApproval: approvals[0],
    pairingMessage,
    error,
    logs,
    applyServerAddress,
    reconnect,
    pairWithUri,
    decideApproval,
    disconnectSession,
    clearLogs: () => setLogs([]),
  };
}
