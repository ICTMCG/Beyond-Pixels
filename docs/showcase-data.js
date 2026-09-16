/* Showcase data for the project page.
   text  : reference image + target text  -> result image(s)
   image : reference image + target image -> result image

   - `live: true` on a result (text) or a case (image) puts it in the hero stage
     and removes it from the grids below, so no result image appears twice.
   - `target` on a result overrides the case-level target (one reference, several targets).
   - text cases with >= 2 visible results are rendered as a fan-out card
     (one reference -> several targets); image cases sharing a `group` are
     rendered as a fan-in card (several references -> one target).
   - `related` links cards across the two sections that share a reference image. */
window.SHOWCASE = {
  liveOrder: ["text:carrot", "image:shoes", "text:sleep", "image:duolingo", "text:crab", "image:catchup"],

  text: [
    { id: "carrot", target: "Cotton towel",
      metaphor: "As fresh as if pulled from the ground → as pure as if grown on the cotton plant.",
      results: [{ src: "static/show/text/carrot_r1.jpg", live: true }] },
    { id: "wine", target: "American fries",
      metaphor: "Part of the product becomes an architectural icon of its origin.",
      results: [{ src: "static/show/text/wine_r1.jpg" }] },
    { id: "catchup", target: "Rose hand cream",
      metaphor: "The product is built from its raw ingredient — plucked, not manufactured.",
      related: [{ kind: "image", id: "catchup_3" }],
      results: [{ src: "static/show/text/catchup_r1.jpg" }] },
    { id: "plane", target: "Child",
      metaphor: "A humble subject casts the shadow of its dream.",
      results: [{ src: "static/show/text/plane_r1.jpg" }] },
    { id: "crab", target: "Crab",
      metaphor: "Ocean trash becomes part of the creature itself.",
      results: [{ src: "static/show/text/crab_r1.jpg", live: true }, { src: "static/show/text/crab_r2.jpg" }] },
    { id: "sleep",
      metaphor: "The product literally is the thing it does for you.",
      related: [{ kind: "image", id: "sleep" }],
      results: [
        { src: "static/show/text/sleep_r2.jpg", target: "Coffee", live: true },
        { src: "static/show/text/sleep_r1.jpg", target: "Scented candle" },
        { src: "static/show/text/sleep_r3.jpg", target: "Headphones" }
      ] },
    { id: "jeep", target: "Salomon shoes",
      metaphor: "Everyday infrastructure shows up in the wildest terrain.",
      results: [{ src: "static/show/text/jeep_r1.jpg" }] },
    { id: "lego", target: "Oil paint",
      metaphor: "The shadow reveals what the object can become.",
      results: [{ src: "static/show/text/lego_r1.jpg" }] },
    { id: "vaseline2", target: "Adhesive",
      metaphor: "A classical artwork is altered to demonstrate what the product does.",
      results: [{ src: "static/show/text/vaseline2_r1.jpg" }] },
    { id: "vaseline", target: "Hair conditioner",
      metaphor: "Dryness borrowed from an object that embodies it.",
      results: [{ src: "static/show/text/vaseline_r1.jpg" }] },
    { id: "pesticide",
      metaphor: "The product's effect, proven on a fictional hero.",
      results: [
        { src: "static/show/text/pesticide_r1.jpg", target: "Energy drink" },
        { src: "static/show/text/pesticide_r2.jpg", target: "Power bank" }
      ] },
    { id: "paper", target: "Quit smoking",
      metaphor: "Every use leaves a visible scar — before and after.",
      results: [{ src: "static/show/text/paper_r1.jpg" }] },
    { id: "fat", target: "Human body",
      metaphor: "A body composed of what it consumes.",
      results: [{ src: "static/show/text/fat_r1.jpg" }] },
    { id: "logo1", target: "Wolf Skin",
      metaphor: "A wordmark shaped by the product's own icon.",
      related: [{ kind: "image", id: "logo" }],
      results: [{ src: "static/show/text/logo1_r1.jpg" }] },
    { id: "mdl4", target: "Coca-Cola",
      metaphor: "A path of light carved through the environment.",
      results: [{ src: "static/show/text/mdl4_r1.jpg" }] },
    { id: "memetgt",
      metaphor: "Trying and missing beats never trying at all.",
      results: [
        { src: "static/show/text/memetgt_r1.jpg", target: "LEGO" },
        { src: "static/show/text/memetgt_r2.jpg", target: "Kindle" }
      ] },
    { id: "meme6", target: "Friday 5 PM",
      metaphor: "Waiting so long you turn to bone.",
      results: [{ src: "static/show/text/meme6_r1.jpg" }] },
    { id: "meme15", target: "Purpose",
      metaphor: "The daily struggle continues until the finish line.",
      results: [{ src: "static/show/text/meme15_r1.jpg" }] },
    { id: "meme20",
      metaphor: "Role reversal — the animal takes the human's place.",
      results: [
        { src: "static/show/text/meme20_r1.jpg", target: "Animal testing" },
        { src: "static/show/text/meme20_r2.jpg", target: "Zoo" }
      ] },
    { id: "meme21", target: "Forest protection",
      metaphor: "The victim becomes the aggressor.",
      results: [{ src: "static/show/text/meme21_r1.jpg" }] }
  ],

  image: [
    { id: "shoes", live: true, target: "Burton snowboard",
      metaphor: "The shadow shows the usage scenario." },
    { id: "duolingo", live: true, target: "Duolingo",
      metaphor: "Always accompanied by an underlying pressure." },
    { id: "catchup", live: true, target: "Sulwhasoo essence",
      metaphor: "The product is built from its raw ingredient." },
    { id: "joker", target: "Mr. Bean",
      metaphor: "A torn surface reveals the inner state." },
    { id: "coffee", group: "fresh-rose", target: "Fresh rose cream", ref: "Nescafé fuel gauge",
      metaphor: "Refuel to full." },
    { id: "glass", group: "fresh-rose", target: "Fresh rose cream", ref: "Taped-up self-portrait",
      metaphor: "Turn the rough into the refined." },
    { id: "catchup_3", group: "fresh-rose", target: "Fresh rose cream", ref: "Heinz tomato stack",
      related: [{ kind: "text", id: "catchup" }],
      metaphor: "Harvested, not manufactured." },
    { id: "logo", target: "Leica camera",
      related: [{ kind: "text", id: "logo1" }],
      metaphor: "A wordmark shaped by the product's own silhouette." },
    { id: "meme", target: "Andy Dufresne",
      metaphor: "Hope arm-wrestles the system." },
    { id: "tooth", target: "Blue Moon detergent",
      metaphor: "Even stone turns soft." },
    { id: "sleep", target: "Sports earphones",
      related: [{ kind: "text", id: "sleep" }],
      metaphor: "Wear them, and anywhere is a sports field." }
  ],

  groups: {
    "fresh-rose": { title: "Three references, one target", note: "The same product shot borrows a different metaphor from each reference." }
  }
};
