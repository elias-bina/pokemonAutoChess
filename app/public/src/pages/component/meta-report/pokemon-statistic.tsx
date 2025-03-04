import React from "react"
import { Pkm, PkmIndex } from "../../../../../types/enum/Pokemon"
import CSS from "csstype"
import { IPokemonsStatistic } from "../../../../../models/mongo-models/pokemons-statistic"
import { getPortraitSrc } from "../../../utils"

const pStyle = {
  fontSize: "1.1vw",
}

export default function PokemonStatistic(props: {
  pokemon: IPokemonsStatistic
}) {
  const imgStyle: CSS.Properties = {
    width: "60px",
    height: "60px",
    imageRendering: "pixelated",
  }
  const portrait = PkmIndex[props.pokemon.name]
    ? getPortraitSrc(PkmIndex[props.pokemon.name])
    : getPortraitSrc(PkmIndex[Pkm.MAGIKARP])
  return (
    <div
      style={{ backgroundColor: "rgb(84, 89, 107)", margin: "10px" }}
      className="nes-container"
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <img style={imgStyle} src={portrait}></img>
        <p style={pStyle}>{props.pokemon.name}</p>
        <p style={pStyle}>Average Place: {props.pokemon.rank}</p>
        <p style={pStyle}>Count: {props.pokemon.count}</p>
        <div style={{ display: "flex" }}>
          {props.pokemon.items.map((item) => {
            return (
              <div
                style={{
                  display: "flex",
                  flexFlow: "column",
                  alignItems: "center",
                }}
                key={item}
              >
                <img style={imgStyle} src={"assets/item/" + item + ".png"} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
