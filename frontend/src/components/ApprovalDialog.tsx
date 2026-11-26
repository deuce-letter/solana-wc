import { useEffect, useRef } from "react";

import type { PendingApproval } from "../hooks/useWalletSocket";
import { PeerAvatar } from "./PeerAvatar";

interface ApprovalDialogProps {
  approval: PendingApproval | undefined;
  queueLength: number;
  onResolve: (approved: boolean) => void;
}

function formatParams(params: unknown): string {
  return JSON.stringify(params, null, 2) ?? String(params);
}

export function ApprovalDialog({
  approval,
  queueLength,
  onResolve,
}: ApprovalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (approval && !dialog.open) {
      dialog.showModal();
    } else if (!approval && dialog.open) {
      dialog.close();
    }
  }, [approval]);

  return (
    <dialog
      className="approval-dialog"
      ref={dialogRef}
      aria-labelledby="approval-heading"
      onCancel={(event) => event.preventDefault()}
    >
      {approval && (
        <>
          <div className="dialog-heading">
            <div className="dialog-icon" aria-hidden="true">
              {approval.type === "request" ? "✦" : "↗"}
            </div>
            <p className="eyebrow">
              {approval.type === "request"
                ? "SIGNING REQUEST"
                : "CONNECTION REQUEST"}
            </p>
            <h2 id="approval-heading">
              {approval.type === "request"
                ? "署名リクエスト"
                : "接続リクエスト"}
            </h2>
          </div>
          <div className="approval-app">
            <PeerAvatar
              name={approval.value.dappName}
              icon={approval.value.dappIcon}
              baseUrl={approval.value.dappUrl}
            />
            <div>
              <h3>{approval.value.dappName}</h3>
              <p>{approval.value.dappUrl}</p>
            </div>
          </div>
          {approval.type === "request" && (
            <div className="request-details">
              <p className="request-method">{approval.value.method}</p>
              <details>
                <summary>リクエスト内容</summary>
                <pre>{formatParams(approval.value.params)}</pre>
              </details>
            </div>
          )}
          <p className="approval-warning">
            内容を確認してから選択してください。
          </p>
          <div className="approval-actions">
            <button
              className="reject-button"
              type="button"
              onClick={() => onResolve(false)}
            >
              拒否
            </button>
            <button
              className="approve-button"
              type="button"
              onClick={() => onResolve(true)}
            >
              {approval.type === "request" ? "承認して署名" : "接続を承認"}
            </button>
          </div>
          {queueLength > 1 && (
            <p className="queue-count">
              残り {queueLength - 1} 件の確認があります
            </p>
          )}
        </>
      )}
    </dialog>
  );
}
