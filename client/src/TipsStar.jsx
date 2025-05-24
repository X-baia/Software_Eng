//this creates an "element" in react, to avoid duplicating code
const TipsStar = ({tip, left, top }) => {
    return (
        <div 
        className="star-container"
        style={{
            position: "absolute",
            left: left,
            top: top
        }}
        > 
            <div class = "glow-star"> 
                <svg viewBox="0 0 100 100" class="star-svg" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="50,10 60,50 50,90 40,50" />
                    <polygon points="10,50 50,60 90,50 50,40" />
                </svg>
                <div className="tip">{tip}</div>
            </div>
        </div>
    )
}

export default TipsStar;