<script>
  import InputBar from "./InputBar.svelte";
  import SkillPane from "./SkillPane.svelte";
  import RoutinePane from "./RoutinePane.svelte";
  import RoutineSetPane from "./RoutineSetPane.svelte";
  import Skill from "./calc.js";
  import { discipline, disciplineToColor } from "./stores.js";

  $: colorClass = disciplineToColor($discipline);

  //let test = new Skill("811o", "DMT");
  let skill = null;
  let routineFlag = false;
  let routineSetFlag = false;

  const newSkillHandler = (event) => {
    const { curFIG, discipline } = event.detail; //event.detail stores the data in the event
    if (curFIG.includes("{")) {
      skill = curFIG
        .slice(1, curFIG.length - 1)
        .split("} {")
        .map((el) => el.split(" ").map((el2) => new Skill(el2, discipline)));
      console.log(skill);
      routineFlag = false;
      routineSetFlag = true;
    } else if (curFIG.split(" ").length == 1) {
      skill = new Skill(curFIG, discipline);
      routineFlag = false;
      routineSetFlag = false;
    } else {
      skill = curFIG.split(" ").map((el) => new Skill(el, discipline));
      routineFlag = true;
      routineSetFlag = false;
    }
  };
</script>

<main>
  <h1>T&T Skill Info</h1>

  <InputBar on:new_skill={newSkillHandler} />
  <p>Enter a skill or routine using FIG notation</p>
  {#if !routineFlag && !routineSetFlag}
    <SkillPane {skill} />
  {:else if routineSetFlag}
    <RoutineSetPane {skill} />
    <div id="spacer" />
    <div id="routineSkills">
      <h2 class={colorClass}>Individual Routines</h2>
      {#each skill as skill}
        <RoutinePane {skill} />
      {/each}
    </div>
  {:else}
    <RoutinePane {skill} />
    <div id="spacer" />
    <div id="routineSkills">
      <h2 class={colorClass}>Individual Skill Information</h2>
      {#each skill as skill}
        <SkillPane {skill} />
      {/each}
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: auto;
    background-color: #222222;
    padding: 30px;
  }
  h1 {
    font-family: "Montserrat";
    font-weight: 800;
    color: white;
    font-size: 45px;
  }

  p {
    font-family: "Montserrat";
    font-size: 14px;
    color: #222222;
    margin-top: 0px;
    padding: 5px;
    margin-left: 10px;
    background-color: #747474;
    width: 290px;
    border-radius: 0px 0px 5px 5px;
    max-width: 100%;
  }

  #routineSkills {
    background-color: #333333;
    padding: 20px;
    border-radius: 10px;
  }

  h2 {
    margin-top: 0px;
    font-size: 20px;
    background-color: inherit;
    font-weight: 800;
  }

  #spacer {
    height: 30px;
  }
</style>
