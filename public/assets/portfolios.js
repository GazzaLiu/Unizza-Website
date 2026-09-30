// Portfolios page: put each card under the group its data-group names (set from the sheet),
// then hide groups that end up with no visible cards. Cards naming an unknown group go to "other".
(function () {
  var sections = {};
  document.querySelectorAll(".portfolio-group[data-group-id]").forEach(function (section) {
    sections[section.getAttribute("data-group-id")] = section;
  });
  if (!sections.other) return;

  document.querySelectorAll(".portfolio-group .portfolio-card").forEach(function (card) {
    var target = sections[card.getAttribute("data-group")] || sections.other;
    if (card.closest(".portfolio-group") !== target) target.querySelector(".grid").appendChild(card);
  });

  Object.keys(sections).forEach(function (id) {
    var section = sections[id];
    var visible = section.querySelectorAll(".portfolio-card:not([hidden])").length > 0;
    section.hidden = !visible;
  });
})();
