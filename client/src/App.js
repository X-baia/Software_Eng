import React from "react";
import { ChakraProvider } from "@chakra-ui/react"
import SleepTracker from "./components/SleepTracker"; 

function App() {
  return React.createElement("div", null, React.createElement(SleepTracker, null));
}

export default App;