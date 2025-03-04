/* eslint-disable @typescript-eslint/no-extra-semi */
import Board from "./board"
import { Schema, MapSchema, type, ArraySchema } from "@colyseus/schema"
import PokemonEntity from "./pokemon-entity"
import PokemonFactory from "../models/pokemon-factory"
import { Pokemon } from "../models/colyseus-models/pokemon"
import { Item } from "../types/enum/Item"
import { Effect } from "../types/enum/Effect"
import { Climate, PokemonActionState, Stat } from "../types/enum/Game"
import Dps from "./dps"
import DpsHeal from "./dps-heal"
import ItemFactory from "../models/item-factory"
import { ISimulation, IPokemonEntity, IPokemon, IPlayer } from "../types"
import { Synergy } from "../types/enum/Synergy"
import { ItemStats } from "../types/Config"
import { getPath } from "../public/src/pages/utils/utils"
import GameRoom from "../rooms/game-room"
import { pickRandomIn } from "../utils/random"
import { Ability } from "../types/enum/Ability"

export default class Simulation extends Schema implements ISimulation {
  @type("string") climate: Climate = Climate.NEUTRAL
  @type({ map: PokemonEntity }) blueTeam = new MapSchema<IPokemonEntity>()
  @type({ map: PokemonEntity }) redTeam = new MapSchema<IPokemonEntity>()
  @type({ map: Dps }) blueDpsMeter = new MapSchema<Dps>()
  @type({ map: Dps }) redDpsMeter = new MapSchema<Dps>()
  @type({ map: DpsHeal }) blueHealDpsMeter = new MapSchema<DpsHeal>()
  @type({ map: DpsHeal }) redHealDpsMeter = new MapSchema<DpsHeal>()
  room: GameRoom
  blueEffects = new Array<Effect>()
  redEffects = new Array<Effect>()
  board: Board = new Board(6, 8)
  finished = false
  flowerSpawn: boolean[] = [false, false]
  stageLevel: number = 0
  player: IPlayer | undefined
  id: string

  constructor(id: string, room: GameRoom) {
    super()
    this.id = id
    this.room = room
  }

  initialize(
    blueTeam: MapSchema<Pokemon>,
    redTeam: MapSchema<Pokemon>,
    player: IPlayer,
    opponent: IPlayer | null, // null if PVE round
    stageLevel: number
  ) {
    this.player = player
    this.stageLevel = stageLevel
    this.blueDpsMeter.forEach((dps, key) => {
      this.blueDpsMeter.delete(key)
    })

    this.redDpsMeter.forEach((dps, key) => {
      this.redDpsMeter.delete(key)
    })

    this.blueHealDpsMeter.forEach((dps, key) => {
      this.blueHealDpsMeter.delete(key)
    })

    this.redHealDpsMeter.forEach((dps, key) => {
      this.redHealDpsMeter.delete(key)
    })

    this.board = new Board(6, 8)
    this.blueEffects = player?.effects?.list ?? []
    this.redEffects = opponent?.effects?.list ?? []
    // logger.debug({ blueEffects, redEffects })

    this.climate = this.getClimate(this.blueEffects, this.redEffects)
    this.room.updateCastform(this.climate)

    // update effects after castform transformation
    this.blueEffects = player?.effects?.list ?? []
    this.redEffects = opponent?.effects?.list ?? []

    this.finished = false
    this.flowerSpawn = [false, false]

    if (blueTeam) {
      blueTeam.forEach((pokemon) => {
        if (pokemon.positionY != 0) {
          this.addPokemon(pokemon, pokemon.positionX, pokemon.positionY - 1, 0)
        }
      })
    }

    if (redTeam) {
      redTeam.forEach((pokemon) => {
        if (pokemon.positionY != 0) {
          this.addPokemon(
            pokemon,
            pokemon.positionX,
            5 - (pokemon.positionY - 1),
            1
          )
        }
      })
    }

    ;[
      { team: blueTeam, effects: this.blueEffects },
      { team: redTeam, effects: this.redEffects }
    ].forEach(({ team, effects }: { team: MapSchema<Pokemon, string>, effects: Effect[] }) => {
      if ([Effect.INFESTATION, Effect.HORDE, Effect.HEART_OF_THE_SWARM].some(e => effects.includes(e))) {

        const teamIndex = team === blueTeam ? 0 : 1
        const bugTeam = new Array<IPokemon>()
        team.forEach((pkm) => {
          if (pkm.types.includes(Synergy.BUG) && pkm.positionY != 0) {
            bugTeam.push(pkm)
          }
        })
        bugTeam.sort((a, b) => b.hp - a.hp)

        let numberToSpawn = 0
        if (effects.includes(Effect.INFESTATION)) { numberToSpawn = 1 }
        if (effects.includes(Effect.HORDE)) { numberToSpawn = 2 }
        if (effects.includes(Effect.HEART_OF_THE_SWARM)) { numberToSpawn = 4 }

        for (let i = 0; i < numberToSpawn; i++) {
          const bug = PokemonFactory.createPokemonFromName(bugTeam[i].name, player.pokemonCollection.get(bugTeam[i].index))
          const coord = this.getClosestAvailablePlaceOnBoard(bugTeam[i], teamIndex)
          this.addPokemon(bug, coord.x, coord.y, teamIndex, true)
        }
      }
    })

    this.applyPostEffects()
  }

  addPokemon(
    pokemon: IPokemon,
    x: number,
    y: number,
    team: number,
    isClone = false
  ) {
    const pokemonEntity = new PokemonEntity(pokemon, x, y, team, this)
    pokemonEntity.isClone = isClone
    this.applyItemsEffects(pokemonEntity)
    this.board.setValue(
      pokemonEntity.positionX,
      pokemonEntity.positionY,
      pokemonEntity
    )

    if (team == 0) {
      this.applyEffects(pokemonEntity, pokemon.types, this.blueEffects)
      const dps = new Dps(pokemonEntity.id, getPath(pokemonEntity))
      const dpsHeal = new DpsHeal(pokemonEntity.id, getPath(pokemonEntity))
      this.blueTeam.set(pokemonEntity.id, pokemonEntity)
      this.blueDpsMeter.set(pokemonEntity.id, dps)
      this.blueHealDpsMeter.set(pokemonEntity.id, dpsHeal)
    }
    if (team == 1) {
      this.applyEffects(pokemonEntity, pokemon.types, this.redEffects)
      const dps = new Dps(pokemonEntity.id, getPath(pokemonEntity))
      const dpsHeal = new DpsHeal(pokemonEntity.id, getPath(pokemonEntity))
      this.redTeam.set(pokemonEntity.id, pokemonEntity)
      this.redDpsMeter.set(pokemonEntity.id, dps)
      this.redHealDpsMeter.set(pokemonEntity.id, dpsHeal)
    }
    return pokemonEntity
  }

  addPokemonEntity(p: PokemonEntity, x: number, y: number, team: number) {
    const pokemon = PokemonFactory.createPokemonFromName(p.name)
    p.items.forEach((i) => {
      pokemon.items.add(i)
    })
    return this.addPokemon(pokemon, x, y, team)
  }

  getFirstAvailablePlaceOnBoard(teamIndex: number): { x: number, y: number } {
    let candidateX = 0, candidateY = 0
    if (teamIndex === 0) {
      outerloop: for (let y = 0; y < this.board.rows; y++) {
        for (let x = 0; x < this.board.columns; x++) {
          if (this.board.getValue(x, y) === undefined) {
            candidateX = x
            candidateY = y
            break outerloop
          }
        }
      }
    } else {
      outerloop: for (let y = 0; y < this.board.rows; y++) {
        for (let x = this.board.columns - 1; x >= 0; x--) {
          if (this.board.getValue(x, y) === undefined) {
            candidateX = x
            candidateY = y
            break outerloop
          }
        }
      }
    }
    return { x: candidateX, y: candidateY }
  }

  getClosestAvailablePlaceOnBoard(pokemon: IPokemon | IPokemonEntity, teamIndex: number): { x: number, y: number } {
    const placesToConsiderByOrderOfPriority = [
      [-1,0], [+1,0], [0,-1], [-1,-1], [+1,-1], [-1,+1], [+1,+1], [0,+1],
      [-2,0], [+2,0], [-2,-1], [+2,-1], [0,-2], [-1,-2], [+1,-2], [-2,-2], [+2,-2],
      [-2,+1], [+2,+1], [-3,0], [+3,0], [-3,-1], [+3,-1], [-3,-2], [+3,-2],
      [0,-3], [-1,-3], [+1,-3], [-2,-3], [+2,-3], [-3,-3], [+3,-3],
      [-3,+1], [+3,+1]
    ]
    for(let [dx,dy] of placesToConsiderByOrderOfPriority){
      let x = pokemon.positionX + dx
      let y = teamIndex === 0 ? pokemon.positionY - 1 + dy : 5 - (pokemon.positionY - 1) - dy

      if (x >= 0 && x < this.board.columns
      && y >= 0 && y < this.board.rows
      && this.board.getValue(x, y) === undefined) {
        return { x, y }
      }
    }
    return this.getFirstAvailablePlaceOnBoard(teamIndex)
  }

  applyStat(pokemon: PokemonEntity, stat: Stat, value: number) {
    switch (stat) {
      case Stat.ATK:
        pokemon.addAttack(value)
        break
      case Stat.DEF:
        pokemon.addDefense(value)
        break
      case Stat.SPE_DEF:
        pokemon.addSpecialDefense(value)
        break
      case Stat.AP:
        pokemon.addAbilityPower(value)
        break
      case Stat.MANA:
        pokemon.setMana(pokemon.mana + value)
        break
      case Stat.ATK_SPEED:
        pokemon.handleAttackSpeed(value)
        break
      case Stat.CRIT_CHANCE:
        pokemon.addCritChance(value)
        break
      case Stat.CRIT_DAMAGE:
        pokemon.addCritDamage(value)
        break
      case Stat.SHIELD:
        pokemon.handleShield(value, pokemon)
        break
      case Stat.HP:
        pokemon.handleHeal(value, pokemon, 0)
        break
    }
  }

  applyItemsEffects(pokemon: PokemonEntity) {
    // wonderbox should be applied first so that wonderbox items effects can be applied after
    if (pokemon.items.has(Item.WONDER_BOX)) {
      pokemon.items.delete(Item.WONDER_BOX)
      const randomItems = ItemFactory.createWonderboxItems(pokemon.items)
      randomItems.forEach((item) => {
        if (pokemon.items.size < 3) {
          pokemon.items.add(item)
        }
      })
    }

    pokemon.items.forEach((item) => {
      this.applyItemEffect(pokemon, item)
    })

    if (pokemon.skill === Ability.SYNCHRO) {
      pokemon.status.triggerSynchro()
    }
  }

  applyItemEffect(pokemon: PokemonEntity, item: Item){
    if (ItemStats[item]) {
      Object.entries(ItemStats[item]).forEach(([stat, value]) =>
        this.applyStat(pokemon, stat as Stat, value)
      )
    }

    if (item === Item.SOUL_DEW) {
      pokemon.status.triggerSoulDew(1000)
    }

    if (item === Item.WIDE_LENS) {
      pokemon.range += 2
    }

    if (item === Item.MAX_REVIVE) {
      pokemon.status.resurection = true
    }
  }

  applyPostEffects() {
    ;[this.blueTeam, this.redTeam].forEach((team) => {
      let grassySurge = false
      let mistySurge = false
      let electricSurge = false
      let psychicSurge = false
      team.forEach((p) => {
        if (p.skill === Ability.GRASSY_SURGE) {
          grassySurge = true
        }
      })
      team.forEach((p) => {
        if (p.skill === Ability.MISTY_SURGE) {
          mistySurge = true
        }
      })
      team.forEach((p) => {
        if (p.skill === Ability.ELECTRIC_SURGE) {
          electricSurge = true
        }
      })
      team.forEach((p) => {
        if (p.skill === Ability.PSYCHIC_SURGE) {
          psychicSurge = true
        }
      })

      team.forEach((p) => {
        if (grassySurge && p.types.includes(Synergy.GRASS)) {
          p.status.grassField = true
        }
        if (psychicSurge && p.types.includes(Synergy.PSYCHIC)) {
          p.status.psychicField = true
        }
        if (electricSurge && p.types.includes(Synergy.ELECTRIC)) {
          p.status.electricField = true
        }
        if (mistySurge && p.types.includes(Synergy.FAIRY)) {
          p.status.fairyField = true
        }
      })

      const ironDefenseCandidates = Array.from(team.values()).filter((p) =>
        p.effects.includes(Effect.IRON_DEFENSE)
      )
      if (ironDefenseCandidates.length > 0) {
        ironDefenseCandidates.forEach((pokemon) => {
          pokemon.effects.splice(
            pokemon.effects.findIndex((e) => e === Effect.IRON_DEFENSE),
            1
          )
        })
        const ironDefensePkm = pickRandomIn(ironDefenseCandidates)
        ironDefensePkm.addAttack(ironDefensePkm.baseAtk)
        ironDefensePkm.effects.push(Effect.IRON_DEFENSE)
      }

      team.forEach((pokemon) => {
        if (pokemon.effects.includes(Effect.AUTOMATE)) {
          pokemon.addAttack(pokemon.baseAtk)
        }
        let shieldBonus = 0
        if (pokemon.effects.includes(Effect.STAMINA)) {
          shieldBonus = 20
        }
        if (pokemon.effects.includes(Effect.STRENGTH)) {
          shieldBonus += 40
        }
        if (pokemon.effects.includes(Effect.ROCK_SMASH)) {
          shieldBonus += 60
        }
        if (pokemon.effects.includes(Effect.PURE_POWER)) {
          shieldBonus += 80
        }
        if (shieldBonus >= 0) {
          pokemon.handleShield(shieldBonus, pokemon)
          const cells = this.board.getAdjacentCells(
            pokemon.positionX,
            pokemon.positionY
          )

          cells.forEach((cell) => {
            if (cell.value && pokemon.team == cell.value.team) {
              cell.value.handleShield(shieldBonus, pokemon)
            }
          })
        }
        if (pokemon.items.has(Item.LUCKY_EGG)) {
          ;[-1, 0, 1].forEach((offset) => {
            const value = this.board.getValue(
              pokemon.positionX + offset,
              pokemon.positionY
            )
            if (value) {
              value.addAbilityPower(30)
            }
          })
        }
        if (pokemon.items.has(Item.RUNE_PROTECT)) {
          const cells = this.board.getAdjacentCells(
            pokemon.positionX,
            pokemon.positionY
          )
          pokemon.status.triggerRuneProtect(6000)
          cells.forEach((cell) => {
            if (cell.value && pokemon.team == cell.value.team) {
              cell.value.status.triggerRuneProtect(6000)
            }
          })
        }

        if (pokemon.items.has(Item.FOCUS_BAND)) {
          ;[-1, 0, 1].forEach((offset) => {
            const value = this.board.getValue(
              pokemon.positionX + offset,
              pokemon.positionY
            )
            if (value) {
              value.handleAttackSpeed(30)
            }
          })
        }

        if (pokemon.items.has(Item.DELTA_ORB)) {
          ;[-1, 0, 1].forEach((offset) => {
            const value = this.board.getValue(
              pokemon.positionX + offset,
              pokemon.positionY
            )
            if (value) {
              value.status.deltaOrb = true
            }
          })
        }

        if (pokemon.items.has(Item.FLAME_ORB)) {
          pokemon.addAttack(pokemon.baseAtk)
          pokemon.status.triggerBurn(
            60000,
            pokemon as PokemonEntity,
            pokemon as PokemonEntity,
            this.board
          )
          pokemon.status.wound = true
          pokemon.status.woundCooldown = 60000
        }
      })
    })
  }

  applyEffects(
    pokemon: PokemonEntity,
    types: ArraySchema<Synergy>,
    allyEffects: Effect[]
  ) {
    allyEffects.forEach((effect) => {
      switch (effect) {
        case Effect.HONE_CLAWS:
          if (types.includes(Synergy.DARK)) {
            pokemon.addCritChance(40)
            pokemon.addCritDamage(0.25)
            pokemon.effects.push(Effect.HONE_CLAWS)
          }
          break

        case Effect.ASSURANCE:
          if (types.includes(Synergy.DARK)) {
            pokemon.addCritChance(60)
            pokemon.addCritDamage(0.5)
            pokemon.effects.push(Effect.ASSURANCE)
          }
          break

        case Effect.BEAT_UP:
          if (types.includes(Synergy.DARK)) {
            pokemon.addCritChance(80)
            pokemon.addCritDamage(0.75)
            pokemon.effects.push(Effect.BEAT_UP)
          }
          break

        case Effect.ANCIENT_POWER:
        case Effect.ELDER_POWER:
        case Effect.FORGOTTEN_POWER:
          if (types.includes(Synergy.FOSSIL)) {
            pokemon.effects.push(effect)
          }
          break

        case Effect.BLAZE:
          if (types.includes(Synergy.FIRE)) {
            pokemon.effects.push(Effect.BLAZE)
          }
          break

        case Effect.VICTORY_STAR:
          if (types.includes(Synergy.FIRE)) {
            pokemon.effects.push(Effect.VICTORY_STAR)
          }
          break

        case Effect.DROUGHT:
          if (types.includes(Synergy.FIRE)) {
            pokemon.effects.push(Effect.DROUGHT)
          }
          break

        case Effect.DESOLATE_LAND:
          if (types.includes(Synergy.FIRE)) {
            pokemon.effects.push(Effect.DESOLATE_LAND)
          }
          break

        case Effect.INGRAIN:
          if (types.includes(Synergy.GRASS)) {
            pokemon.effects.push(Effect.INGRAIN)
          }
          break

        case Effect.GROWTH:
          if (types.includes(Synergy.GRASS)) {
            pokemon.effects.push(Effect.GROWTH)
          }
          break

        case Effect.SPORE:
          if (types.includes(Synergy.GRASS)) {
            pokemon.effects.push(Effect.SPORE)
          }
          break

        case Effect.RAIN_DANCE:
          if (types.includes(Synergy.WATER)) {
            pokemon.addDodgeChance(0.25)
            pokemon.effects.push(Effect.RAIN_DANCE)
          }
          break

        case Effect.DRIZZLE:
          if (types.includes(Synergy.WATER)) {
            pokemon.addDodgeChance(0.5)
            pokemon.effects.push(Effect.DRIZZLE)
          }
          break

        case Effect.PRIMORDIAL_SEA:
          if (types.includes(Synergy.WATER)) {
            pokemon.addDodgeChance(0.75)
            pokemon.effects.push(Effect.PRIMORDIAL_SEA)
          }
          break

        case Effect.STAMINA:
          if (types.includes(Synergy.NORMAL)) {
            pokemon.effects.push(Effect.STAMINA)
          }
          break

        case Effect.STRENGTH:
          if (types.includes(Synergy.NORMAL)) {
            pokemon.effects.push(Effect.STRENGTH)
          }
          break

        case Effect.ROCK_SMASH:
          if (types.includes(Synergy.NORMAL)) {
            pokemon.effects.push(Effect.ROCK_SMASH)
          }
          break

        case Effect.PURE_POWER:
          if (types.includes(Synergy.NORMAL)) {
            pokemon.effects.push(Effect.PURE_POWER)
          }
          break

        case Effect.EERIE_IMPULSE:
          if (types.includes(Synergy.ELECTRIC)) {
            pokemon.effects.push(Effect.EERIE_IMPULSE)
          }
          break

        case Effect.RISING_VOLTAGE:
          if (types.includes(Synergy.ELECTRIC)) {
            pokemon.effects.push(Effect.RISING_VOLTAGE)
          }
          break

        case Effect.OVERDRIVE:
          if (types.includes(Synergy.ELECTRIC)) {
            pokemon.effects.push(Effect.OVERDRIVE)
          }
          break

        case Effect.GUTS:
          if (types.includes(Synergy.FIGHTING)) {
            pokemon.effects.push(Effect.GUTS)
          }
          break

        case Effect.DEFIANT:
          if (types.includes(Synergy.FIGHTING)) {
            pokemon.effects.push(Effect.DEFIANT)
          }
          break

        case Effect.JUSTIFIED:
          if (types.includes(Synergy.FIGHTING)) {
            pokemon.effects.push(Effect.JUSTIFIED)
          }
          break

        case Effect.IRON_DEFENSE:
          if (types.includes(Synergy.STEEL)) {
            pokemon.effects.push(Effect.IRON_DEFENSE)
          }
          break

        case Effect.AUTOMATE:
          if (types.includes(Synergy.STEEL)) {
            pokemon.effects.push(Effect.AUTOMATE)
          }
          break

        case Effect.BULK_UP:
          if (types.includes(Synergy.FIELD)) {
            pokemon.effects.push(Effect.BULK_UP)
          }
          break

        case Effect.RAGE:
          if (types.includes(Synergy.FIELD)) {
            pokemon.effects.push(Effect.RAGE)
          }
          break

        case Effect.ANGER_POINT:
          if (types.includes(Synergy.FIELD)) {
            pokemon.effects.push(Effect.ANGER_POINT)
          }
          break

        case Effect.PURSUIT:
          if (types.includes(Synergy.MONSTER)) {
            pokemon.effects.push(Effect.PURSUIT)
          }
          break

        case Effect.BRUTAL_SWING:
          if (types.includes(Synergy.MONSTER)) {
            pokemon.effects.push(Effect.BRUTAL_SWING)
          }
          break

        case Effect.POWER_TRIP:
          if (types.includes(Synergy.MONSTER)) {
            pokemon.effects.push(Effect.POWER_TRIP)
          }
          break

        case Effect.AMNESIA:
          if (types.includes(Synergy.PSYCHIC)) {
            pokemon.effects.push(Effect.AMNESIA)
            pokemon.addAbilityPower(50)
          }
          break

        case Effect.LIGHT_SCREEN:
          if (types.includes(Synergy.PSYCHIC)) {
            pokemon.effects.push(Effect.LIGHT_SCREEN)
            pokemon.addAbilityPower(100)
          }
          break

        case Effect.EERIE_SPELL:
          if (types.includes(Synergy.PSYCHIC)) {
            pokemon.effects.push(Effect.EERIE_SPELL)
            pokemon.addAbilityPower(150)
          }
          break

        case Effect.MEDITATE:
          pokemon.effects.push(Effect.MEDITATE)
          break

        case Effect.FOCUS_ENERGY:
          pokemon.effects.push(Effect.FOCUS_ENERGY)
          break

        case Effect.CALM_MIND:
          pokemon.effects.push(Effect.CALM_MIND)
          break

        case Effect.TAILWIND:
          if (types.includes(Synergy.FLYING)) {
            pokemon.flyingProtection = true
            pokemon.effects.push(Effect.TAILWIND)
          }
          break

        case Effect.FEATHER_DANCE:
          if (types.includes(Synergy.FLYING)) {
            pokemon.flyingProtection = true
            pokemon.effects.push(Effect.FEATHER_DANCE)
          }
          break

        case Effect.MAX_AIRSTREAM:
          if (types.includes(Synergy.FLYING)) {
            pokemon.flyingProtection = true
            pokemon.effects.push(Effect.MAX_AIRSTREAM)
          }
          break

        case Effect.MAX_GUARD:
          if (types.includes(Synergy.FLYING)) {
            pokemon.flyingProtection = true
            pokemon.effects.push(Effect.MAX_GUARD)
          }
          break

        case Effect.SWIFT_SWIM:
          if (types.includes(Synergy.AQUATIC)) {
            pokemon.effects.push(Effect.SWIFT_SWIM)
          }
          break

        case Effect.HYDRATION:
          if (types.includes(Synergy.AQUATIC)) {
            pokemon.effects.push(Effect.HYDRATION)
          }
          break

        case Effect.WATER_VEIL:
          if (types.includes(Synergy.AQUATIC)) {
            pokemon.effects.push(Effect.WATER_VEIL)
          }
          break

        case Effect.ODD_FLOWER:
          if (types.includes(Synergy.FLORA)) {
            pokemon.effects.push(Effect.ODD_FLOWER)
          }
          break

        case Effect.GLOOM_FLOWER:
          if (types.includes(Synergy.FLORA)) {
            pokemon.effects.push(Effect.GLOOM_FLOWER)
          }
          break

        case Effect.VILE_FLOWER:
          if (types.includes(Synergy.FLORA)) {
            pokemon.effects.push(Effect.VILE_FLOWER)
          }
          break

        case Effect.SUN_FLOWER:
          if (types.includes(Synergy.FLORA)) {
            pokemon.effects.push(Effect.SUN_FLOWER)
          }
          break

        case Effect.BATTLE_ARMOR:
          if (types.includes(Synergy.ROCK)) {
            pokemon.handleShield(50, pokemon)
            pokemon.effects.push(Effect.BATTLE_ARMOR)
          }
          break

        case Effect.MOUTAIN_RESISTANCE:
          if (types.includes(Synergy.ROCK)) {
            pokemon.handleShield(100, pokemon)
            pokemon.effects.push(Effect.MOUTAIN_RESISTANCE)
          }
          break

        case Effect.DIAMOND_STORM:
          if (types.includes(Synergy.ROCK)) {
            pokemon.handleShield(200, pokemon)
            pokemon.effects.push(Effect.DIAMOND_STORM)
          }
          break

        case Effect.PHANTOM_FORCE:
          if (types.includes(Synergy.GHOST)) {
            pokemon.effects.push(Effect.PHANTOM_FORCE)
          }
          break

        case Effect.CURSE:
          if (types.includes(Synergy.GHOST)) {
            pokemon.effects.push(Effect.CURSE)
          }
          break

        case Effect.SHADOW_TAG:
          if (types.includes(Synergy.GHOST)) {
            pokemon.effects.push(Effect.SHADOW_TAG)
          }
          break

        case Effect.WANDERING_SPIRIT:
          if (types.includes(Synergy.GHOST)) {
            pokemon.effects.push(Effect.WANDERING_SPIRIT)
          }
          break

        case Effect.AROMATIC_MIST:
          if (types.includes(Synergy.FAIRY)) {
            pokemon.effects.push(Effect.AROMATIC_MIST)
          }
          break

        case Effect.FAIRY_WIND:
          if (types.includes(Synergy.FAIRY)) {
            pokemon.effects.push(Effect.FAIRY_WIND)
          }
          break

        case Effect.STRANGE_STEAM:
          if (types.includes(Synergy.FAIRY)) {
            pokemon.effects.push(Effect.STRANGE_STEAM)
          }
          break

        case Effect.DRAGON_ENERGY:
          if (types.includes(Synergy.DRAGON)) {
            pokemon.effects.push(Effect.DRAGON_ENERGY)
          }
          break

        case Effect.DRAGON_DANCE:
          if (types.includes(Synergy.DRAGON)) {
            pokemon.effects.push(Effect.DRAGON_DANCE)
          }
          break

        case Effect.SNOW:
          pokemon.effects.push(Effect.SNOW)
          break

        case Effect.SHEER_COLD:
          pokemon.effects.push(Effect.SHEER_COLD)
          break

        case Effect.POISON_GAS:
          if (types.includes(Synergy.POISON)) {
            pokemon.effects.push(Effect.POISON_GAS)
          }
          break

        case Effect.TOXIC:
          if (types.includes(Synergy.POISON)) {
            pokemon.effects.push(Effect.TOXIC)
          }
          break

        case Effect.LARGO:
          if (types.includes(Synergy.SOUND)) {
            pokemon.effects.push(Effect.LARGO)
          }
          break

        case Effect.ALLEGRO:
          if (types.includes(Synergy.SOUND)) {
            pokemon.effects.push(Effect.ALLEGRO)
          }
          break

        case Effect.PRESTO:
          if (types.includes(Synergy.SOUND)) {
            pokemon.effects.push(Effect.PRESTO)
          }
          break

        case Effect.INFESTATION:
          if (types.includes(Synergy.BUG)) {
            pokemon.effects.push(Effect.INFESTATION)
          }
          break

        case Effect.HORDE:
          if (types.includes(Synergy.BUG)) {
            pokemon.effects.push(Effect.HORDE)
          }
          break

        case Effect.HEART_OF_THE_SWARM:
          if (types.includes(Synergy.BUG)) {
            pokemon.effects.push(Effect.HEART_OF_THE_SWARM)
          }
          break

        case Effect.SHORE_UP:
          if (types.includes(Synergy.GROUND)) {
            pokemon.effects.push(Effect.SHORE_UP)
          }
          break

        case Effect.ROTOTILLER:
          if (types.includes(Synergy.GROUND)) {
            pokemon.effects.push(Effect.ROTOTILLER)
          }
          break

        case Effect.SANDSTORM:
          if (types.includes(Synergy.GROUND)) {
            pokemon.effects.push(Effect.SANDSTORM)
          }
          break

        case Effect.DUBIOUS_DISC:
          if (types.includes(Synergy.ARTIFICIAL) && pokemon.items.size != 0) {
            pokemon.addAttack(4 * pokemon.items.size)
            pokemon.handleShield(20 * pokemon.items.size, pokemon)
            pokemon.effects.push(Effect.DUBIOUS_DISC)
          }
          break

        case Effect.LINK_CABLE:
          if (types.includes(Synergy.ARTIFICIAL) && pokemon.items.size != 0) {
            pokemon.addAttack(7 * pokemon.items.size)
            pokemon.handleShield(30 * pokemon.items.size, pokemon)
            pokemon.effects.push(Effect.LINK_CABLE)
          }
          break

        case Effect.GOOGLE_SPECS:
          if (types.includes(Synergy.ARTIFICIAL) && pokemon.items.size != 0) {
            pokemon.addAttack(10 * pokemon.items.size)
            pokemon.handleShield(50 * pokemon.items.size, pokemon)
            pokemon.effects.push(Effect.GOOGLE_SPECS)
          }
          break

        case Effect.HATCHER:
          if (types.includes(Synergy.BABY)) {
            pokemon.effects.push(Effect.HATCHER)
          }
          break

        case Effect.BREEDER:
          if (types.includes(Synergy.BABY)) {
            pokemon.effects.push(Effect.BREEDER)
          }
          break

        default:
          break
      }
    })
  }

  getClimate(blueEffects: Effect[], redEffects: Effect[]) {
    function getPlayerClimate(effects: Effect[]){
      return effects.includes(Effect.SANDSTORM) ? Climate.SANDSTORM
      : effects.includes(Effect.DESOLATE_LAND) ? Climate.SUN
      : effects.includes(Effect.PRIMORDIAL_SEA) ? Climate.RAIN
      : effects.includes(Effect.DROUGHT) ? Climate.SUN
      : effects.includes(Effect.DRIZZLE) ? Climate.RAIN
      : effects.includes(Effect.SHEER_COLD) ? Climate.SNOW
      : effects.includes(Effect.VICTORY_STAR) ? Climate.SUN      
      : effects.includes(Effect.SNOW) ? Climate.SNOW      
      : effects.includes(Effect.RAIN_DANCE) ? Climate.RAIN
      : Climate.NEUTRAL
    }

    const redClimate = getPlayerClimate(redEffects)
    const blueClimate = getPlayerClimate(blueEffects)
    
    if(redClimate !== Climate.NEUTRAL && blueClimate === Climate.NEUTRAL) return redClimate
    if(blueClimate !== Climate.NEUTRAL && redClimate === Climate.NEUTRAL) return blueClimate
    if(redClimate === blueClimate) return redClimate

    // sandstorm beats everything
    if(redClimate === Climate.SANDSTORM || blueClimate === Climate.SANDSTORM) return Climate.SANDSTORM

    // snow beats rain
    if(redClimate === Climate.SNOW && blueClimate === Climate.RAIN) return Climate.SNOW
    if(blueClimate === Climate.SNOW && redClimate === Climate.RAIN) return Climate.SNOW

    // sunlight beats snow
    if(redClimate === Climate.SNOW && blueClimate === Climate.SUN) return Climate.SUN
    if(blueClimate === Climate.SNOW && redClimate === Climate.SUN) return Climate.SUN

    // rain beats sunlight
    if(redClimate === Climate.SUN && blueClimate === Climate.RAIN) return Climate.RAIN
    if(blueClimate === Climate.SUN && redClimate === Climate.RAIN) return Climate.RAIN

    return Climate.NEUTRAL
  }

  update(dt: number) {
    if (this.blueTeam.size == 0 || this.redTeam.size == 0) {
      this.finished = true
      if (this.blueTeam.size == 0) {
        this.redTeam.forEach((p) => {
          p.action = PokemonActionState.HOP
        })
      } else {
        this.blueTeam.forEach((p) => {
          p.action = PokemonActionState.HOP
        })
      }
    }

    this.blueTeam.forEach((pkm, key) => {
      this.blueDpsMeter
        .get(key)
        ?.changeDamage(pkm.physicalDamage, pkm.specialDamage, pkm.trueDamage)
      this.blueHealDpsMeter.get(key)?.changeHeal(pkm.healDone, pkm.shieldDone)

      if (!pkm.life || pkm.life <= 0) {
        this.blueTeam.delete(key)
      } else {
        pkm.update(dt, this.board, this.climate)
      }
    })

    this.redTeam.forEach((pkm, key) => {
      this.redDpsMeter
        .get(key)
        ?.changeDamage(pkm.physicalDamage, pkm.specialDamage, pkm.trueDamage)
      this.redHealDpsMeter.get(key)?.changeHeal(pkm.healDone, pkm.shieldDone)

      if (!pkm.life || pkm.life <= 0) {
        this.redTeam.delete(key)
      } else {
        pkm.update(dt, this.board, this.climate)
      }
    })
  }

  stop() {
    this.blueTeam.forEach((pokemon, key) => {
      // logger.debug('deleting ' + pokemon.name);
      this.blueTeam.delete(key)
    })

    this.redTeam.forEach((pokemon, key) => {
      // logger.debug('deleting ' + pokemon.name);
      this.redTeam.delete(key)
    })

    this.climate = Climate.NEUTRAL
  }
}
