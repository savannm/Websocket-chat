"use-client";

import { useState, useEffect } from 'react';
import { preview } from 'vite';


export default function MsgSave() {
    let [message, setMessage] = useState([""]);
    const [inputValue, setInputValue] = useState("");
    useEffect(() => {

        console.log(message)
        // Remove
        // setItems(prev => prev.filter(i => i.id !== id));
        // Update
        // setItems(prev => prev.map(i => i.id === id ? {...i, done:true} : i));
    }, [message]); // empty array = run once

    //add input value
    const handleInput = (e) => {
        e.preventDefault();
        if (inputValue.trim() === "") return;
        //sort by alphabetical order
        setMessage(prev => [...prev, inputValue])
        //clear input value
        setInputValue("")

    }

    //sort names
    const sortInput = () => {
        setMessage(prev => [...prev].sort((a, b) => a.localeCompare(b)));
    }

    // Search for the input text and delete matching items from the list
    const deleteInput = () => {
        if (inputValue.trim() === "") return; // Don't do anything if input is empty
        setMessage(prev => prev.filter(item => item !== inputValue)); //delete user by input value
        setInputValue(""); // Clear the box after searching/deleting
    }


    return (
        <div>
            <div className="flex flex-col justify-center items-center">
                <input id="NewUsers" type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}></input>
                <br></br>
            </div>
            <div className="flex flex-row justify-left items-left">
                <div className="pl-2 pr-2"><button onClick={handleInput}>Add</button></div>
                <div className="pl-2 pr-2"><button onClick={sortInput}>Sort</button></div>
                <div className="pl-2 pr-2"><button onClick={deleteInput}>Delete</button></div>

            </div>
            <div>
                {message.map((data, index) => (
                    <p key={index}>{data}</p>
                ))}
            </div>
        </div>
    )
}