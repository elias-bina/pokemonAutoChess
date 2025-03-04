import React, { Dispatch, FormEvent, SetStateAction, useState } from "react"
import Modal from "react-bootstrap/Modal"
import { loadPreferences, savePreferences } from "../../../preferences"
import { getGameScene } from "../../game"

export default function GameOptionsModal(props: {    
    show: boolean,
    hideModal: Dispatch<SetStateAction<boolean>>,
    leave: () => void
  }) {
    const initialVolume = loadPreferences().musicVolume
    const [musicVolume, setMusicVolume] = useState(initialVolume)

    function changeMusicVolume(e: FormEvent<HTMLInputElement>){
        const newValue = Number((e.target as HTMLInputElement).value)
        setMusicVolume(newValue)
        const gameScene = getGameScene()
        if(gameScene && gameScene.music){
          (gameScene.music as Phaser.Sound.WebAudioSound).setVolume(newValue / 100)
        }
    }

    return (
        <Modal show={props.show}>
        <Modal.Header>
          <Modal.Title>Options</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <label>Music Volume: { musicVolume } %
            <input type="range" min="0" max="100" value={musicVolume} onInput={changeMusicVolume}></input>
            </label>
          </p>
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: "space-between" }}>
          <button className="bubbly red" onClick={props.leave}>Leave game</button>
          <button
            className="bubbly green"
            onClick={() => {
              savePreferences({ musicVolume })
              props.hideModal(true)
            }}
          >
            Save
          </button>
        </Modal.Footer>
      </Modal>
    )
}