<script>
  import { discipline, disciplineToColor } from "./stores.js";
  import "./calc.js";
  export let skill;

  $: colorClass = disciplineToColor($discipline);

  var shapeToString = function (shape) {
    if (shape == "o") {
      return "tuck";
    } else if (shape == "<") {
      return "pike";
    } else if (shape == "/") {
      return "layout";
    } else {
      // throw("????");
      return "n/a";
    }
  };
</script>

<main>
  {#if skill}
    <div id="outputDiv">
      <div id="InfoBar" class={colorClass}>
        <h2 id="SkillInfoTitle">
          {skill.name}
          {skill.ddStringPermanent}
        </h2>
      </div>
      <div id="skillInfo" class={colorClass}>
        <p id="skillInfoText">
          DD: <strong>{skill.DD}</strong> <br />
          Flips: <strong>{skill.quarterFlips / 4}</strong> <br />
          Twists: <strong>{skill.twistsTotal / 2}</strong> <br />
          Shape: <strong>{shapeToString(skill.shape)}</strong> <br />
          Direction: <strong>{skill.backward ? "backward" : "forward"}</strong>
        </p>
      </div>
    </div>
  {/if}
</main>

<style>
  #outputDiv {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: left;
    justify-content: left;
    margin-top: 20px;
    border-radius: 10px;
  }
  #titleBar,
  #InfoBar {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: left;
    border-radius: 10px 10px 0px 0px;
    height: 50px;
  }

  #titleBar {
    margin-top: 20px;
    border-radius: 10px;
  }

  h2 {
    font-size: 20px;
    font-weight: 900;
    padding: 10px;
  }

  #skillFIG {
    float: right;
    /* why don't you float??? */
  }

  #skillName {
    float: left;
  }

  #skillInfo {
    padding: 10px;
    font-size: 20px;
    border-radius: 0px 0px 10px 10px;
  }

  p {
    margin: 3px;
  }
</style>
