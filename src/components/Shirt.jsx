import { useEffect, useState, useMemo, useImperativeHandle, useRef, forwardRef, useSyncExternalStore } from "react"
import useWindowDimensions from "../hooks/useWindowDimensions.jsx"
import useToggle from "../hooks/useToggle.jsx"
import useObject from "../hooks/useObject.jsx"
import {motion, useAnimate, stagger} from 'framer-motion'
import IMAGES from '../assets/images.js'

// BUG: position coords aren't updated on move, causing some position issues when animating with dynamic points


function Shirt({design, slogan, animated=false, size=400, initialData}, imperativeRef) {
    const [ref, animate] = useAnimate()
    const {width: windowWidth, height: windowHeight} = useWindowDimensions()
    let bounds = {x:windowWidth-size, y:windowHeight-size}
    let center = {x: bounds.x/2, y: bounds.y/2}
    useEffect(() => {
        bounds = {x:windowWidth-size, y:windowHeight-size}
        center = {x: bounds.x/2, y: bounds.y/2}
    }, [windowWidth, windowHeight])

    const [shirtRendered, toggleShirtRendered] = useToggle(initialData.shirtRendered)
    const [shirtVisible, toggleShirtVisible] = useToggle(initialData.shirtVisible)
    const [designVisible, toggleDesignVisible] = useToggle(initialData.designVisible)
    const [sloganVisible, toggleSloganVisible] = useToggle(initialData.sloganVisible)

    let initialPosition = initialData.position
    const positions = {
        center: center,
        leftCenter: {x:bounds.x*0.21, y: center.y},
        rightCenter: {x:bounds.x*0.79, y: center.y},
        inline: {x:0, y:0}  // ignores position data and places component in document flow
    }
    function positionCheck(pos) {
        if (!pos.x || !pos.y) {
            pos = positions[pos]
        }
        return pos
    }
    initialPosition = positionCheck(initialPosition)

    const {object: position, update: updatePosition} = useObject(initialPosition)
    // const [position, updatePosition] = useState(initialPosition)

    const logPosition = () => console.log("the position is", position)
    if (shirtRendered) {
        // logPosition()
    }
    
    const template = () => {
        // make template appear opts:[location, with design, with text]
    }
    const showDesign = () => {
        toggleDesignVisible(true)
    }
    const showText = () => {
        toggleSloganVisible(true)
    }
    const move = async (destination, duration) => { // {x, y}
        destination = positionCheck(destination)
        console.log("i'm moving to", destination, "and I think the position is", position)
        await animate(
            ref.current, 
            {
                top: destination.y,
                left: destination.x
            },
            {duration: duration ?? 1}
        )
        console.log("attempting coords update");
        await updatePosition(destination)
        console.log("finished moving");
    }
    const enter = async (direction, {destination=position}) => {
        // slide in opts:[direction, destination coords]
        console.log("Entering from", direction);
        console.log("I'm entering and I think the position is", position);
        toggleShirtVisible(false)
        await move(destination, 0)
        switch (direction) {
            case "from-top":
            case "down":
                await move({...destination, y:0-size-100}, 0)
                break
            case "from-bottom":
            case "up":
                await move({...destination, y:bounds.y+size+100}, 0)
                break
            case "from-left":
            case "right":
                await move({...destination, x:0-size-100}, 0)
                break
            case "from-right":
            case "left":
                await move({...destination, x:bounds.x+size+100}, 0)
                break
        }
        toggleShirtVisible(true)
        await move(destination)
    }
    const exit = async (direction) => {
        // slide out opts:[direction]
        console.log("exiting to", direction);
        console.log("I'm exiting and I think the position is", position);
        switch (direction) {
            case "to-top":
            case "up":
                await move({...position, y:0-size-100}, 1)
                break
            case "to-bottom":
            case "down":
                await move({...position, y:bounds.y+size+100}, 1)
                break
            case "to-left":
            case "left":
                await move({...position, x:0-size-100}, 1)
                break
            case "to-right":
            case "right":
                await move({...position, x:bounds.x+size+100}, 1)
                break
        }
        toggleShirtVisible(false)
    }
    const explode = async () => {

    }
    const discard = () => {
        // discard animation for shirt opts:[animation (def random)]
            // disappear (for after animations when shirt should not be visible) 
            // stock explosion effect
            // drop in cheese bowl (inside joke, don't worry about it)
            // turn to dust (if it's not hard to make)
    }
    const background = () => {
        // background animations for winning
            // spinning star behind
    }

    useImperativeHandle(
        imperativeRef,
        () => ({
            test: (str) => console.log(str),
            position: position,
            bounds: bounds, 
            logPosition,
            goToCorner: () => updatePosition({x:0, y:0}),
            toggleRendered: (value) => toggleShirtRendered(value ?? undefined),
            toggleVisible: (value) => toggleShirtVisible(value ?? undefined),
            parts: ({
                template,
                design: showDesign,
                text: showText,
            }),
            movement: ({
                move,
                enter,
                exit,
            }),
            discard,
            background
        }),
        []
    )

    if (!shirtRendered) {
        return null
    }
    if (design === undefined) return 'loading...'
    
    return (
        <motion.svg 
            width={size} 
            height={size} 
            ref={ref} 
            style={{
                background: "#3633ff63",
                // position: initialData.position === 'inline' ? "initial" : "absolute",
                position: "initial",    // not gonna worry about animations for now
            }}
            className={!shirtVisible ? `invisible` : ''}
            initial={{
                left: position.x,
                top: position.y,
            }}
        >
            <svg
                width={size} 
                height={size}
            >
                <defs>
                    {/* Background fill mask */}
                    <mask id="mask" x="0" y="0" width="100%" height="100%">
                        <image xlinkHref={IMAGES.shirtMask} x="0" y="0" width="100%" height="100%" />
                    </mask>
                </defs>
                {/* Background fill */}
                <rect x="0" y="0" width="100%" height="100%" fill={design.backgroundColor} mask="url(#mask)" />
                {/* Template outline */}
                <image href={IMAGES.shirtTemplate} width="100%" height="100%" />

                {designVisible &&
                    <Design frames={design.frames} animated={animated} offset={{x:size*0.23, y:size*0.23}} width={size*0.52}/>
                }

                {sloganVisible &&
                    <Slogan text={slogan.text} offset={{x:size*0.211, y:size*0.75}} width={size*0.559} height={size*0.142}/>
                }
            </svg>
        </motion.svg>
    )
}

export function Design({frames, animated=true, loop=false, offset={x:0, y:0}, width=400}) {
    const [frame, setFrame] = useState(0)
    let t

    // reset everything when frames array changes
    useEffect(() => {
        // loop animation if true
        if (loop) {
            setFrame(0)
        }
        clearTimeout(t)
    }, [frames])

    useEffect(() => {
        if (frame < frames.length - 1) {
            t = setTimeout(() => {
                setFrame(frame + 1)
            }, (70 * (0.95**frames.length) + 1))    // delay between frames decreases exponentially with more frames
        }
        
    }, [frame])

    return (
        <svg>
            <image xlinkHref={animated ? frames[frame] : frames[frames.length - 1]} x={offset.x} y={offset.y} width={width}/>
        </svg>
    )
}
export function Slogan({text, offset={x:0,y:0}, width=400, height=200, color='white'}) {

    // useEffect(() => {
    //     console.log("mounted");
    // }, [])

    // stuff for scaling the font to fit the alloted space, clean the code later
    function estimateWrappedLines(text, fontSize, containerWidth) {
        const words = text.split(' ');
      
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px sans-serif`;
      
        let lineCount = 1;
        let currentLine = words[0];
      
        for (let i = 1; i < words.length; i++) {
            const currentText = currentLine + ' ' + words[i];
            const textWidth = context.measureText(currentText).width;
        
            // console.log(i, currentLine, textWidth, containerWidth);
            if (textWidth > containerWidth) {
                // console.log(`new line`);
                lineCount++;
                currentLine = words[i];
            } else {
                currentLine += ' ' + words[i];
            }
        }
      
        return lineCount;
    }
    const size = useMemo(() => {
        const preScale = height * 0.65
        const lines = estimateWrappedLines(text, preScale, width)
          
        return Math.min(
            width / (text.length/2), 
            preScale
        ) * (lines - ((lines * 0.7) - 0.7))
    }, [height, width, text])

    return (
        <svg 
            x={offset.x} 
            y={offset.y} 
            width={width} 
            height={height}
        >
            {/* background fill to show bounds of text area */}
            {/* <rect x="0" y="0" width="100%" height="100%" fill="#ff00ff5e" /> */}    
            <foreignObject x="0" y="0" width="100%" height="100%">
                <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        // justifyContent: 'center',
                        // alignItems: 'center',
                        overflowWrap: 'break-word',
                    }}
                >
                    <motion.span 
                        style={{
                            textAlign: 'center',
                            textJustify: 'start',
                            color: color, 
                            fontFamily: 'Impact', 
                            fontSize: size
                        }}
                        initial={{
                            scale: 0
                        }}
                        animate={{
                            scale: 1,
                        }}
                        transition={{
                            duration: 0.4,
                            ease: "easeInOut",
                        }}
                    >{text}</motion.span>
                </div>
            </foreignObject>
        </svg>
    )
}

export default forwardRef(Shirt)



 /*
        * Animation of voting round
        * start empty
        * voting round 1:
        * blank first shirt slides in from center bottom to center
        * design draws on shirt
        * text appears
        * shirt moves over to left side
        * vs appears in middle
        * second blank shirt slides in from right bottom, to right spot on other side of vs
        * design is drawn on
        * text appears
    * Awaiting ... 
    * finished with votes:
        * vote counts appear by shirts with just 0s to start
        * audience groups appear at bottom (uncounted, evenly sized groups as if 50/50, not numbers yet)
        * counts votes giving each 1 at a time, putting the names of players who voted for the shirt at the top with their mini icon
        * once all player votes counted, audience vote groups populate to match audience vote percentages
        * audience vote numbers appear beneath groups
        * audience vote groups and numbers move up to player vote numbers
        * vote counts increase by audience vote counts
        * numbers change to percentages of the total votes (doing a flip animation)
        * winning vote count has a spinning sun effect behind it (losing vote count doesn't change)
        * (spin goes away) >
        * winner's full art (victor variant) and name slides in from their side to below the their shirt a bit off to the side
        * counter falls into them
        * loser's fill art (loser variant) slides in from their corresponding side going to the same orientation
        * losing shirt gets destroyed and slides out to bottom
        * losing character art and name slide out to the side
        * winning shirt moves to center (once there gains spinning sun effect behind it with 'WINNER" above, it slides in from above I think)
        * > while moving winner art and name slides out to the bottom then zooms in next to shirt
        * "WINNER" slides out to top > shirt slides out to bottom > winner art and name zoom out
    * empty again
    * voting round 2:
        * surviving shirt from last time slides in from bottom on left (design and slogan already filled in)
        * vs appears in middle
        * next shirt slides in from right bottom to it's position on the right of the vs
        * <continues same as round 1>
    * after final vote clears away: 
        * streak winner shirt zooms in on left
        * KOH winner shirt zooms in on right
        * "STREAK WINNER" text slides in from top to above shirt > creator's art and name slide in from corresponding side
        * "GAUNTLET WINNER" and KOH winner's art and name do the same thing on the other side
        * all items (shirts, text, art and names) zoom out (as one collective group to screen center, not individually in their spots)
    */