import React, { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import AfterMenu from "./component/after/after-menu"
import { Client, Room } from "colyseus.js"
import { useAppDispatch, useAppSelector } from "../hooks"
import AfterGameState from "../../../rooms/states/after-game-state"
import firebase from "firebase/compat/app"
import { FIREBASE_CONFIG } from "./utils/utils"
import { joinAfter, logIn } from "../stores/NetworkStore"
import { addPlayer, leaveAfter, setNoELO } from "../stores/AfterGameStore"
import { playSound, SOUNDS } from "./utils/audio"

export default function AfterGame() {
  const dispatch = useAppDispatch()
  const client: Client = useAppSelector((state) => state.network.client)
  const currentPlayerId: string = useAppSelector((state) => state.network.uid)
  const room: Room<AfterGameState> | undefined = useAppSelector(
    (state) => state.network.after
  )
  const [initialized, setInitialized] = useState<boolean>(false)
  const [toLobby, setToLobby] = useState<boolean>(false)
  const [toAuth, setToAuth] = useState<boolean>(false)

  useEffect(() => {
    const reconnect = async () => {
      setInitialized(true)
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG)
      }
      firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
          dispatch(logIn(user))
          try {
            const cachedReconnectionToken = localStorage.getItem(
              "cachedReconnectionToken"
            )
            if (cachedReconnectionToken) {
              const r: Room<AfterGameState> = await client.reconnect(
                cachedReconnectionToken
              )
              await initialize(r)
              dispatch(joinAfter(r))
            } else {
              setToLobby(true)
            }
          } catch (error) {
            setTimeout(async () => {
              const cachedReconnectionToken = localStorage.getItem(
                "cachedReconnectionToken"
              )
              if (cachedReconnectionToken) {
                const r: Room<AfterGameState> = await client.reconnect(
                  cachedReconnectionToken
                )
                await initialize(r)
                dispatch(joinAfter(r))
              } else {
                setToLobby(true)
              }
            }, 1000)
          }
        } else {
          setToAuth(true)
        }
      })
    }

    const initialize = async (r: Room<AfterGameState>) => {
      localStorage.setItem("cachedReconnectionToken", r.reconnectionToken)
      r.state.players.onAdd((player) => {
        dispatch(addPlayer(player))
        if (player.id === currentPlayerId) {
          playSound(SOUNDS["FINISH" + player.rank])
        }
      })
      r.state.listen("noElo", (value, previousValue) => {
        dispatch(setNoELO(value))
      })
    }

    if (!initialized) {
      reconnect()
    }
  })

  if (toLobby) {
    return <Navigate to="/lobby" />
  }
  if (toAuth) {
    return <Navigate to="/auth" />
  } else {
    return (
      <div className="after-game">
        <button
          className="bubbly blue"
          style={{ margin: "10px 0 0 10px" }}
          onClick={() => {
            if (room) {
              room.connection.close()
            }
            dispatch(leaveAfter())
            setToLobby(true)
          }}
        >
          Back to Lobby
        </button>
        <AfterMenu />
      </div>
    )
  }
}
