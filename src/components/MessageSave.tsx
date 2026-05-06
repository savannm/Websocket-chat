"use-client";

import { useState } from 'react';




export default function messageSave() {
    // Safe ONLY when: list is static, never reordered, items never deleted
    const [message, setMessage] = useState([]);
    // Add
    setMessage(prev => [...prev, "sav"]);
    // Remove
    // setItems(prev => prev.filter(i => i.id !== id));
    // Update
    // setItems(prev => prev.map(i => i.id === id ? {...i, done:true} : i));


    return (
        <div>
            {message.map((data, index) => (
                <p key={index} value={index}>{data} sav is here</p>
            ))}
        </div>
    )
}


