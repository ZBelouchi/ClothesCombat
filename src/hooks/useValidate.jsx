import { useState, useEffect } from 'react'
//TODO: add catch for is server cannot be reached for so long, rn it just will wait until a success or failure

export default function useValidate({session=undefined, player=undefined, spectator=undefined, strict=true, doValidation=true, onInvalid=((res)=>{}), onValid=((res)=>{}), onPending=(()=>{}), dependencies=[]}) {
    const [report, setReport] = useState({})
    const query = Object.entries({session: session, player: player, spectator: spectator})
        .filter(([k,v]) => v !== undefined)
        .map(([k,v]) => `${k}=${v}`)
        .join('&')

    useEffect(() => {
        const interval = setInterval(
            () => {
                if (!doValidation) return
                onPending()
                fetch(`http://localhost:3000/validate?strict=${strict}&${query}`)
                    .then(response => response.json())
                    .then(res => {
                        if (res.success) {
                            onValid(res)
                            setReport(res.report)
                        } else {
                            onInvalid(res)
                            setReport(res.report)
                        }
                    })
                    .catch(err => console.log("not valid"))
            },
            500
        )
        return () => {
            clearInterval(interval)
        }
    }, session, player, spectator, dependencies)

    return report
}