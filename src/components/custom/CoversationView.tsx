import React from "react";
import { Conversation, Message } from "@/api/types";
import MarkdownWithCode from "@/components/custom/MarkdownWithCode";
import MarkdownMessage from "./MarkdownMessage";
import { formatDistanceToNow } from 'date-fns';
import { Bot, Copy } from "lucide-react";
import { logger } from "@/utils/logger";

type CoversationViewProps = {
  c:Conversation | null
}

type MessageViewProps = {
  m: Message
}

const MessageView = ({m}:MessageViewProps) => {
  const isUser = m.role == "user"
  const frindlyTime = formatDistanceToNow(new Date(m.updated_at), {addSuffix: true})
  const footerString = `${isUser ? "" : m.creator + " ~ " }${frindlyTime}` 
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(m.content)
    } catch (err){
      logger.error("Failed to copy!", err)
    }
  }
  console.log(m.content)

  return (
    <li className={`border-1 rounded-sm p-4 group`}> 
      <div className="flex justify-between text-gray-500 font-light">
        <p className="uppercase text-gray-400 px-1.5 py-1 border-gray-300 border-1 rounded-sm text-xs mb-4">{isUser ? "you" : "assisstant"}</p>
        <div 
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          role="button"
          onClick={() => handleCopy()}
          >
          <Copy />
        </div>
      </div>
      { isUser ? m.content: <MarkdownWithCode text={m.content} />}
      <p className="text-sm text-gray-400 mt-2 text-right">{footerString}</p>
    </li>
  )
 }

const ConversationView = ({c}:CoversationViewProps) => {

  const messagesEndRef = React.useRef<HTMLLIElement>(null)
  React.useEffect(() => {
    if (messagesEndRef.current &&  c && c.messages.length > 0 ) {
      messagesEndRef.current.scrollIntoView({behavior: "smooth"})
    }
  }, [c?.messages])


  if (!c) {
    return;
  }
  if (c.messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground h-full">
        <Bot className="h-12 w-12 mb-4 text-cyan-600" />
        <h3 className="text-lg font-medium">No messages yet</h3>
        <p className="text-sm">Start a conversation by typing a message below.</p>
      </div>
    )
  }
 return (
   <ol className="my-4 flex flex-col gap-8 mx-auto max-w-7xl">
      {c.messages.map((message:Message, index) => <MessageView key={index} m={message} />)}
     <li ref={messagesEndRef}></li> 
    </ol>

 ) 
}


export default ConversationView;
