import { GameObjects } from "phaser"
import { getPortraitSrc } from "../../utils"
import GameScene from "../scenes/game-scene"
import indexList from "../../../dist/client/assets/pokemons/indexList.json"
import { Transfer } from "../../../../types"

export default class LoadingManager {
  scene: GameScene
  loadingBar: GameObjects.Container
  statusMessage: string

  constructor(scene: GameScene) {
    this.scene = scene
    this.statusMessage = "Loading..."

    scene.load.on("progress", (value: number) => {
      this.scene.room?.send(Transfer.LOADING_PROGRESS, value * 100)
    })

    this.scene.load.on("fileprogress", (file, percentComplete) => {
      if (percentComplete < 1) {
        this.statusMessage = "Loading asset: " + file.key
      }
    })

    this.scene.load.on("complete", () => {
      this.scene.room?.send(Transfer.LOADING_COMPLETE)
      this.statusMessage = "Loading complete, waiting for other players..."
    })

    this.preload()
  }

  preload() {
    const scene = this.scene
    indexList.forEach((id) => {
      scene.load.image(`portrait-${id}`, getPortraitSrc(id))
      scene.load.multiatlas(
        id,
        `/assets/pokemons/${id}.json`,
        "/assets/pokemons"
      )
    })

    if (scene.tilemap) {
      scene.load.audio("sound", [
        `https://raw.githubusercontent.com/keldaanInteractive/pokemonAutoChessMusic/main/music/${scene.tilemap.tilesets[0].name}.mp3`
      ])
      scene.load.image(
        "tiles",
        `/assets/tilesets/${scene.tilemap.tilesets[0].name}.png`
      )
      scene.load.tilemapTiledJSON("map", scene.tilemap)
    }
    scene.load.image("rain", "/assets/ui/rain.png")
    scene.load.image("sand", "/assets/ui/sand.png")
    scene.load.image("sun", "/assets/ui/sun.png")
    scene.load.multiatlas(
      "snowflakes",
      "/assets/ui/snowflakes.json",
      "/assets/ui/"
    )

    loadStatusMultiAtlas(this.scene)

    scene.load.multiatlas("item", "/assets/item/item.json", "/assets/item/")
    scene.load.multiatlas("lock", "/assets/lock/lock.json", "/assets/lock/")
    scene.load.multiatlas(
      "attacks",
      "/assets/attacks/attacks.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "specials",
      "/assets/attacks/specials.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "ROAR_OF_TIME",
      "/assets/attacks/ROAR_OF_TIME.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "ROCK_TOMB",
      "/assets/attacks/ROCK_TOMB.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "ROCK_SMASH",
      "/assets/attacks/ROCK_SMASH.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "VOLT_SWITCH",
      "/assets/attacks/VOLT_SWITCH.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "STEAM_ERUPTION",
      "/assets/attacks/STEAM_ERUPTION.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "APPLE_ACID",
      "/assets/attacks/APPLE_ACID.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SPECTRAL_THIEF",
      "/assets/attacks/SPECTRAL_THIEF.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "PLASMA_FIST",
      "/assets/attacks/PLASMA_FIST.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SACRED_SWORD",
      "/assets/attacks/SACRED_SWORD.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SHADOW_SNEAK",
      "/assets/attacks/SHADOW_SNEAK.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "DIVE",
      "/assets/attacks/DIVE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "LIQUIDATION",
      "/assets/attacks/LIQUIDATION.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "PAYDAY",
      "/assets/attacks/PAYDAY.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "HYPER_VOICE",
      "/assets/attacks/HYPER_VOICE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SHADOW_CLONE",
      "/assets/attacks/SHADOW_CLONE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "PETAL_DANCE",
      "/assets/attacks/PETAL_DANCE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "ECHO",
      "/assets/attacks/ECHO.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "INCENSE_DAMAGE",
      "/assets/attacks/INCENSE_DAMAGE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "BRIGHT_POWDER",
      "/assets/attacks/BRIGHT_POWDER.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "STATIC",
      "/assets/attacks/STATIC.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "EXPLOSION",
      "/assets/attacks/EXPLOSION.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SHADOW_BALL",
      "/assets/attacks/SHADOW_BALL.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SEED_FLARE",
      "/assets/attacks/SEED_FLARE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "ORIGIN_PULSE",
      "/assets/attacks/ORIGIN_PULSE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "EARTHQUAKE",
      "/assets/attacks/EARTHQUAKE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "AQUA_JET",
      "/assets/attacks/AQUA_JET.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "MIND_BLOWN",
      "/assets/attacks/MIND_BLOWN.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "MIND_BLOWN_SELF",
      "/assets/attacks/MIND_BLOWN_SELF.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SOFT_BOILED",
      "/assets/attacks/SOFT_BOILED.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "BONEMERANG",
      "/assets/attacks/BONEMERANG.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "GROWL",
      "/assets/attacks/GROWL.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "RELIC_SONG",
      "/assets/attacks/RELIC_SONG.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "DISARMING_VOICE",
      "/assets/attacks/DISARMING_VOICE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "HIGH_JUMP_KICK",
      "/assets/attacks/HIGH_JUMP_KICK.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "TRI_ATTACK",
      "/assets/attacks/TRI_ATTACK.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "CLANGOROUS_SOUL",
      "/assets/attacks/CLANGOROUS_SOUL.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "CONFUSING_MIND",
      "/assets/attacks/CONFUSING_MIND.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SONG_OF_DESIRE",
      "/assets/attacks/SONG_OF_DESIRE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "FIELD_DEATH",
      "/assets/attacks/FIELD_DEATH.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "FAIRY_CRIT",
      "/assets/attacks/FAIRY_CRIT.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "BLUE_FLARE",
      "/assets/attacks/BLUE_FLARE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "FUSION_BOLT",
      "/assets/attacks/FUSION_BOLT.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "CHATTER",
      "/assets/attacks/CHATTER.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "FUTURE_SIGHT",
      "/assets/attacks/FUTURE_SIGHT.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SPIKE_ARMOR",
      "/assets/attacks/SPIKE_ARMOR.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "FAKE_TEARS",
      "/assets/attacks/FAKE_TEARS.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SPARKLING_ARIA",
      "/assets/attacks/SPARKLING_ARIA.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SMOG",
      "/assets/attacks/SMOG.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "AURORA_BEAM",
      "/assets/attacks/AURORA_BEAM.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SKY_ATTACK",
      "/assets/attacks/SKY_ATTACK.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "ILLUSION",
      "/assets/attacks/ILLUSION.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "pmd-replace",
      "/assets/attacks/pmd-replace.json",
      "/assets/attacks"
    )
    scene.load.image("money", "/assets/ui/money.svg")
    scene.load.multiatlas(
      "ICE_RANGE",
      "/assets/attacks/ICE_RANGE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "SPIRIT_SHACKLE",
      "/assets/attacks/SPIRIT_SHACKLE.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "WATER_SHURIKEN",
      "/assets/attacks/WATER_SHURIKEN.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "FIGHTING",
      "/assets/attacks/FIGHTING.json",
      "/assets/attacks"
    )
    scene.load.image("STRING_SHOT", "/assets/attacks/STRING_SHOT.png")
    scene.load.multiatlas(
      "WONDER_GUARD",
      "/assets/attacks/WONDER_GUARD.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "X_SCISSOR",
      "/assets/attacks/X_SCISSOR.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "GEOMANCY",
      "/assets/attacks/GEOMANCY.json",
      "/assets/attacks"
    )
    scene.load.multiatlas(
      "DEATH_WING",
      "/assets/attacks/DEATH_WING.json",
      "/assets/attacks"
    )
  }
}

export function loadStatusMultiAtlas(scene: Phaser.Scene) {
  scene.load.multiatlas(
    "status",
    "/assets/status/status.json",
    "/assets/status/"
  )
  scene.load.multiatlas("wound", "/assets/status/wound.json", "/assets/status")
  scene.load.multiatlas(
    "resurection",
    "/assets/status/resurection.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "paralysis",
    "/assets/status/PARALYSIS.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "rune_protect",
    "/assets/status/RUNE_PROTECT.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "armorReduction",
    "/assets/status/ARMOR_REDUCTION.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "ELECTRIC_SURGE",
    "/assets/status/ELECTRIC_SURGE.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "VOID_BOOST",
    "/assets/status/VOID_BOOST.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "PSYCHIC_SURGE",
    "/assets/status/PSYCHIC_SURGE.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "GRASSY_SURGE",
    "/assets/status/GRASSY_SURGE.json",
    "/assets/status"
  )
  scene.load.multiatlas(
    "MISTY_SURGE",
    "/assets/status/MISTY_SURGE.json",
    "/assets/status"
  )
}
