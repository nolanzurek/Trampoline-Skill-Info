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
          Routine: {skill
            .map((el) => el.ddStringPermanent)
            .reduce((a, b) => a + " " + b)}
        </h2>
      </div>
      <div id="skillInfo" class={colorClass}>
        <p id="skillInfoText">
          DD: <strong>{skill.map((el) => el.DD).reduce((a, b) => a + b)}</strong
          > <br />
          Average DD:
          <strong
            >{skill.map((el) => el.DD).reduce((a, b) => a + b) /
              skill.length}</strong
          > <br />
          Total Flips:
          <strong
            >{skill.map((el) => el.quarterFlips).reduce((a, b) => a + b) /
              4}</strong
          > <br />
          Average Flips:
          <strong
            >{skill.map((el) => el.quarterFlips).reduce((a, b) => a + b) /
              4 /
              skill.length}</strong
          > <br />
          Total Twists:
          <strong
            >{skill.map((el) => el.twistsTotal).reduce((a, b) => a + b) /
              2}</strong
          > <br />
          Average Twists:
          <strong
            >{skill.map((el) => el.twistsTotal).reduce((a, b) => a + b) /
              2 /
              skill.length}</strong
          > <br />
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
