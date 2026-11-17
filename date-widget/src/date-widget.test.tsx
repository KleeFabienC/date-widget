import React from "react"
import {screen, render} from "@testing-library/react"

import {DateWidget} from "./date-widget";

describe("DateWidget", () => {
    it("should render the component", () => {
        render(<DateWidget contentLanguage="en_US" message="World"/>);

        expect(screen.getByText(/Hello World/)).toBeInTheDocument();
    })
})
