"use client";
import { useEffect, useState } from "react"

export default function InstallPrompt() {
    const [isIOS, setIsIOS] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)
   
    useEffect(() => {
      setIsIOS(
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
      )
   
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    }, [])
   
    if (isStandalone) {
      return null // Don't show install button if already installed
    }
   
    return (isIOS && (
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 max-w-sm mx-auto">
        
        <h3 className="text-2xl font-bold text-white mb-4">Install App</h3>
          <p className="text-white text-sm">
            To install this app on your iOS device, tap the share button and then &quot;Add to Home Screen&quot;
            <span role="img" aria-label="plus icon" className="inline-block ml-1">
              ➕
            </span>.
          </p>
      </div>
        )
    )
  }