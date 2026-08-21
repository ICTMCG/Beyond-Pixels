# Examples

Place your own reference images in this directory and run, e.g.:

```bash
python run.py --reference examples/your_reference.jpg --subject "FRESH Rose Cream" \
    --out outputs/rose_cream
```

The reference image should be a creative image that already contains a visual
metaphor (e.g. a product advertisement, meme, film poster, or comic). The pipeline
extracts its Schema Grammar and re-instantiates the underlying creative logic for
your target subject.

Note: the 126-image evaluation dataset used in the paper was curated from the
internet (product ads, memes, film posters, comics, and other creative works).
Because we do not hold redistribution rights for those images, they are not
included in this repository.
