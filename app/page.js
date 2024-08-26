'use client'
import { AppBar, Box, Button, Stack, TextField, Toolbar, Typography } from "@mui/material";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi!, I'm the Rate My Professor support assistant. How can I help you today?"
    }
  ]);
  
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    const newMessages = [
      ...messages,
      { role: "user", content: message },
    ];

    setMessages([
      ...newMessages,
      { role: "assistant", content: '' },
    ]);
  
    setMessage('');

    const response = fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...newMessages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }

        const text = decoder.decode(value || new Uint8Array, { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });

        return reader.read().then(processText);
      });
    });
  };

  return (
    <Box 
      width="100vw" 
      height="100vh" 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      style={{background: "linear-gradient(0deg, rgba(22,22,29,1) 0%, rgba(26,72,75,1) 73%)"}}
    >
      <AppBar 
        position="static" 
        sx={{ background: "rgba(26,72,75,1)", boxShadow: "none", backdropFilter: "blur(10px)" }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Rate My Professor Assistant
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Stack 
        direction="column" 
        width="900px" 
        height="700px" 
        border="1px solid rgba(255, 255, 255, 0.2)" 
        borderRadius={8} 
        p={2} 
        spacing={3} 
        mt={15}
        sx={{ backgroundColor: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(10px)" }}
      > 
        <Stack 
          direction="column" 
          spacing={2} 
          flexGrow={1} 
          overflow="auto" 
          maxHeight="100%"
        >
          {messages.map((message, index) => (
            <Box 
              key={index} 
              display="flex" 
              justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}
            >
              <Box 
                bgcolor={message.role === "assistant" ? "#FFCDD2" : "#90CAF9"} 
                color="black" 
                borderRadius={16} 
                p={2}
                sx={{ boxShadow: 3 }}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField 
            focused 
            label="Type your message..." 
            fullWidth 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            sx={{ input: { color: 'white' }, label: { color: 'rgba(255, 255, 255, 0.7)' }, fieldset: { borderColor: 'rgba(255, 255, 255, 0.2)' } }}
          />
          <Button 
            variant="contained" 
            onClick={sendMessage}
            sx={{ backgroundColor: '#81C784', '&:hover': { backgroundColor: '#66BB6A' } }}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}