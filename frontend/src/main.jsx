import React, { createContext, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

export const Context = createContext({
  isAuthorized: false,
});

const AppWrapper = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState({});
  // true until the initial /user/getuser check resolves, so routes can render a
  // spinner instead of bouncing a refreshing page to /login.
  const [authLoading, setAuthLoading] = useState(true);
  // One-time login greeting (report §8.2): in-memory on purpose — no
  // localStorage, so it resets cleanly when the session ends on logout.
  const [greeting, setGreeting] = useState(null);

  return (
    <ThemeProvider>
      <Context.Provider
        value={{
          isAuthorized,
          setIsAuthorized,
          user,
          setUser,
          authLoading,
          setAuthLoading,
          greeting,
          setGreeting,
        }}
      >
        <App />
      </Context.Provider>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
