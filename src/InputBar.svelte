<script>
  import { createEventDispatcher, text } from "svelte/internal";
  import { discipline, disciplineToColor } from "./stores.js";
  import { get } from "svelte/store";
  const dispatch = createEventDispatcher();

  $: colorClass = disciplineToColor($discipline);

  let curFIG = "";
  let newSkillFlag = true;

  const newSkill = function (e) {
    console.log(e.type);
    if (e.key == "Enter") {
      e.preventDefault();
      e.stopPropagation();
      newSkillFlag = false;
      dispatch("new_skill", { curFIG, discipline: get(discipline) });
    } else if (e.type == "change" && !newSkillFlag) {
      e.preventDefault();
      e.stopPropagation();
      dispatch("new_skill", { curFIG, discipline: get(discipline) });
    }
  };
</script>

<main>
  <div id="inputDiv">
    <input
      type="text"
      id="FigIN"
      bind:value={curFIG}
      on:keypress={newSkill}
      class={colorClass}
    />
    <input
      bind:group={$discipline}
      on:change={newSkill}
      value="TRI"
      type="radio"
      id="TRI"
      name="event"
      class="radioElement"
      checked
    />
    <label for="TRI" class={colorClass}>TRI</label>
    <input
      bind:group={$discipline}
      on:change={newSkill}
      value="DMT"
      type="radio"
      id="DMT"
      name="event"
      class="radioElement"
    />
    <label for="DMT" class={colorClass}>DMT</label>
    <input
      bind:group={$discipline}
      on:change={newSkill}
      value="TUM"
      type="radio"
      id="TUM"
      name="event"
      class="radioElement"
    />
    <label for="TUM" class={colorClass}>TUM</label>
  </div>
</main>

<style>
  #inputDiv {
    width: 100%;
    display: flex;
    height: 50px;
  }

  #FigIN {
    width: 70%;
    height: 100%;
    float: left;
    outline: none;
    padding: 10px;
    border: none;
    border-radius: 10px 0px 0px 10px;
    font-family: "Montserrat", sans-serif;
    font-size: 20px;
    font-weight: 900;
  }

  #eventSelector {
    font-weight: 700;
    width: 30%;
  }

  .radioElement {
    display: none;
  }

  label {
    display: flex;
    font-size: 20px;
    font-weight: 900;
    width: 10%;
    min-width: 75px;
    align-items: center;
    justify-content: center;
  }

  #TUM + label {
    border-radius: 0px 10px 10px 0px;
  }
</style>
