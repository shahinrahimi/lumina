import { Message } from "@/api/types"
import { useClipboard } from "@/hooks/useClipboard";
import { formatDistanceToNow } from "date-fns"
import { Copy } from "lucide-react";
import AssistantMessageView from "./AssistantMessageView";
import UserMessageView from "./UserMessageView";
const MessageView = ({m}:{m:Message}) => {
  const {copy} = useClipboard()
  const isUser = m.role == "user"
  const friendlyTime = formatDistanceToNow(new Date(m.updated_at), {addSuffix: true})
  const footerString = `${isUser ? "" : m.creator + " ~ " }${friendlyTime}` 
  
  return (
    <li className={`border-1 rounded-sm p-4 group ${isUser ? "bg-background": "bg-white"}`}> 
      <div className="flex justify-between text-gray-500 font-light">
        <p className="uppercase text-gray-400 px-1.5 py-1 border-gray-300 border-1 rounded-sm text-xs mb-4">{isUser ? "you" : "assistant"}</p>
        <div 
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          role="button"
          onClick={() => copy(m.content)}
          >
          <Copy />
        </div>
      </div>
      { isUser ? <UserMessageView m={m} />: <AssistantMessageView m={m}/>}
      <p className="text-sm text-gray-400 mt-2 text-right">{footerString}</p>
    </li>
  )
}

export default MessageView;
