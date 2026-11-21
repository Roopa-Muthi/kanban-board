import { useState } from "react";
import { useSnapshot } from "../data/useStore";

export function StorageBanner() {
  const { loadStatus, saveFailed } = useSnapshot();
  const [dismissed, setDismissed] = useState(false);

  if (loadStatus === "unavailable") {
    return (
      <p role="alert" className="banner banner-warn">
        Your browser is blocking local storage, so boards can't be saved. Anything you change will
        be lost when you close this tab.
      </p>
    );
  }
  if (saveFailed) {
    return (
      <p role="alert" className="banner banner-warn">
        Couldn't save your latest changes. Storage may be full or blocked. They'll be lost when you
        close this tab.
      </p>
    );
  }
  if (loadStatus === "corrupt" && !dismissed) {
    return (
      <p role="status" className="banner banner-info">
        Your saved data couldn't be read, so the app started with an empty list. A copy of the old
        data was kept in this browser.{" "}
        <button type="button" className="link-btn" onClick={() => setDismissed(true)}>
          Dismiss
        </button>
      </p>
    );
  }
  return null;
}