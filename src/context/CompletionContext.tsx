
import React from "react"
import {v4 as uuidv4} from "uuid"
import  {Message, Conversation }from "@/api/types";
import { fetchGenerateCompletionStream } from "@/api/generate-stream";
import { GenerateCompletionReq } from "@/api/types";
import { fetchGenerateCompletion } from "@/api/generate";
import { logger } from "@/utils/logger";
import { removeThinkBlocks } from "@/utils";

const STORAGE_KEY = "completion-conversations";

interface CompletionContextType {
  conversations: Conversation[];
  currentId: string | null;
  setCurrentId: (id: string) => void;
  addMessageToCurrent: (message: Message) => void;
  updateLastAssistantMessage: (content: string) => void;
  getNewConversation:() => string;
  clearConversations: () => void;
  getCurrentConversation: () => Conversation | null;
  currentConversation: Conversation | null;
  deleteConversation: (id: string) => void;

  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  system: string;
  setSystem: React.Dispatch<React.SetStateAction<string>>;
  temperature: number;
  setTemperature: React.Dispatch<React.SetStateAction<number>>;
  seed: string;
  setSeed: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent, modelName: string) => void;
  isLoading: boolean;
}

const CompletionContext = React.createContext<CompletionContextType | undefined>(undefined)

export const CompletionProvider: React.FC<{children:React.ReactNode}> = ({children}) => {
  const [conversations, setConversations] = React.useState<Conversation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved): [];
  })
  const [currentId, setCurrentId] = React.useState<string|null>(null)
  const [input, setInput] = React.useState<string>("")
  const [system, setSystem] = React.useState<string>("")
  const [seed, setSeed] = React.useState<string>("")
  const [temperature, setTemperature] = React.useState<number>(0.7)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  },[conversations])

  React.useEffect(() => {
    const conv = getCurrentConversation();
    if (conv) {
      setSystem(conv.system || "")
      setTemperature(conv.temperature ?? 0.7)
      setSeed(conv.seed || "")
    }
  }, [currentId])

  React.useEffect(() => {
    if (currentId) {
      updateCurrentConversationSettings({ system })
    }
  }, [system])

  React.useEffect(() => {
    if (currentId) {
      updateCurrentConversationSettings({ temperature })
    }
  }, [temperature])

  React.useEffect(() => {
    if (currentId) {
      updateCurrentConversationSettings({ seed })
    }
  }, [seed])
  
  const getCurrentConversation = ():Conversation | null => {
    return conversations.find((c:Conversation) => c.id === currentId) || null;
  }

  const updateCurrentConversationSettings = (updates: Partial<Conversation>) => {
    setConversations((prevConvs) => 
      prevConvs.map((c:Conversation) => 
        c.id === currentId ? {...c, ...updates, updated_at: Date.now()} : c
      ) 
    )
  }

  const renameConversation = (id:string, newTitle: string) => {
    setConversations((prevConvs) =>
      prevConvs.map((c:Conversation) =>
        c.id === id ? { ...c, title: newTitle, updated_at: Date.now() } : c
      )
    );
  }

  const deleteConversation = (id:string) => {
    setConversations((prevConvs) =>
      prevConvs.filter((c:Conversation) => c.id !== id)
    ) 
  }

   const getNewConversation = ():string => {
    // check if currntly have any empty Conversation
    let emptConv:Conversation = conversations.filter((c:Conversation) => c.messages.length === 0)[0]
    if (!emptConv) {
      const id = uuidv4()
      emptConv = {
        id,
        title: "New Converation",
        messages:[],
        created_at: Date.now(),
        updated_at: Date.now(),
      }
      setConversations((prev:Conversation[]) => [emptConv, ...prev])
    } else {
      emptConv.updated_at = Date.now()
      emptConv.created_at = Date.now()
    }
    setCurrentId(emptConv.id)
    return emptConv.id
  }


  const addMessageToCurrent = (message: Message) => {
    setConversations((prev:Conversation[]) => 
      prev.map((conv:Conversation) => {
        if (conv.id === currentId) {
          return {...conv, messages: [...conv.messages, message], updated_at: Date.now()}
        }else {
          return conv
        } 
      })
    )
  }
  const updateLastAssistantMessage = (content: string) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== currentId) return conv;
        const updated = [...conv.messages];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + content,
            updated_at: Date.now(),
          };
        }
        return { ...conv, messages: updated, updated_at: Date.now() };
      })
    );
  };

  const clearConversations = () => {
    setConversations([]);
    setCurrentId(null)    
  }


  const handleSubmit = (e:React.FormEvent, model:string) => {
    e.preventDefault()
    if (input.trim() == "" || !model) {
      return
    }

    // add prompt to messages with role user
    const m:Message = {
      content: input,
      role: "user",
      creator: "user",
      created_at: Date.now(),
      updated_at: Date.now()
    }

    const featuredMessage:Message = {
      content: "",
      creator: model,
      role: "assistant",
      created_at: Date.now(),
      updated_at: Date.now()
    }
    
    let conv = getCurrentConversation()
    if (conv?.messages.length === 0) {
      const reqTitle :GenerateCompletionReq = {
        system: "You are a naming assistant. Given a system prompt that describes a tool or AI assistant, generate a short, clear, and creative name that reflects the tool’s purpose. The name must be between 2 to 4 words, relevant to the described function. Respond only with the name. Do not include any explanation or extra text. now name this assistance for following prompt as system input:",
        prompt: system ? system : input,
        model: model,
        stream: false,
        keep_alive: "0m", 
      }


    fetchGenerateCompletion(
      reqTitle,
      (resp) => {
        if (currentId) {
          // exlude <think>..</think>:
          const title = removeThinkBlocks(resp)
          renameConversation(currentId, title) 
        }
      },
      (error) => logger.error(error)
    )

    }

    const req: GenerateCompletionReq = {
      model:model,
      system: system,
      prompt: input,
      stream: true,
    }

    addMessageToCurrent(m)
    addMessageToCurrent(featuredMessage)
    setInput("")
    setIsLoading(true)
   
    fetchGenerateCompletionStream(
      req,
      (resp) => {
        updateLastAssistantMessage(resp.response)
        if (resp.done) setIsLoading(false)
      },
      (error) => {
        logger.error(error)
        setIsLoading(false)
      }
    ) 
  }

  const value = {
    conversations,
    currentConversation: getCurrentConversation(),
    currentId,
    setCurrentId,
    addMessageToCurrent,
    updateLastAssistantMessage,
    getNewConversation,
    clearConversations,
    getCurrentConversation,
    deleteConversation,
    
    setInput,
    input,
    setSystem,
    system,
    setTemperature,
    temperature,
    seed,
    setSeed,
    
    handleSubmit,
    isLoading

  }

  return (
    <CompletionContext.Provider value={value}>
      {children}
    </CompletionContext.Provider>
  )
}

export const useCompletion = () => {
  const ctx = React.useContext(CompletionContext);
  if (!ctx) throw new Error("useCompletion must be used within CompletionProvider")
  return ctx
}


