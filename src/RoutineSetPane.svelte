<script>
  import { discipline, disciplineToColor } from "./stores.js";
  import "./calc.js";
  export let skill;

  $: colorClass = disciplineToColor($discipline);

  //found online
  function toFindDuplicates(arry) {
    const uniqueElements = new Set(arry);
    const filteredElements = arry.filter((item) => {
      if (uniqueElements.has(item)) {
        uniqueElements.delete(item);
      } else {
        return item;
      }
    });

    return [...new Set(uniqueElements)];
  }

  $: totalSkillList = skill
    .flat()
    .map((el) => el.ddStringPermanent)
    .filter((el) => !"hf^(".includes(el));
  console.log(totalSkillList);
</script>

<main>
  {#if skill}
    <div id="outputDiv">
      <div id="InfoBar" class={colorClass}>
        <h2 id="SkillInfoTitle">Routine Set Info</h2>
      </div>
      <div id="skillInfo" class={colorClass}>
        <p id="skillInfoText">
          <!-- to fix: tumbling does not check for duplicate skills -->
          {new Set(totalSkillList).size !== totalSkillList.length
            ? "This is not a valid routine set because it contains a duplicate " +
              totalSkillList.filter((e, i, a) => a.indexOf(e) !== i)[0]
            : "This is a valid routine set"} <br />
          Total DD:
          <strong
            >{skill
              .flat()
              .map((el) => el.DD)
              .reduce((a, b) => a + b)}</strong
          ><br />
          Average DD per routine:
          <strong
            >{skill
              .flat()
              .map((el) => el.DD)
              .reduce((a, b) => a + b) / skill.length}</strong
          ><br />
          Total Flips:
          <strong
            >{skill
              .flat()
              .map((el) => el.quarterFlips)
              .reduce((a, b) => a + b) / 4}</strong
          ><br />
          Average flips per routine:
          <strong
            >{skill
              .flat()
              .map((el) => el.quarterFlips)
              .reduce((a, b) => a + b) /
              (4 * skill.length)}</strong
          ><br />
          Total Twists:
          <strong
            >{skill
              .flat()
              .map((el) => el.twistsTotal)
              .reduce((a, b) => a + b) / 2}</strong
          ><br />
          Average twists per routine:
          <strong
            >{skill
              .flat()
              .map((el) => el.twistsTotal)
              .reduce((a, b) => a + b) /
              (2 * skill.length)}</strong
          ><br />
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
  #InfoBar {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: left;
    border-radius: 10px 10px 0px 0px;
    height: 50px;
  }

  h2 {
    font-size: 20px;
    font-weight: 900;
    padding: 10px;
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
