use rmcp::model::{Annotations, MetaObject, Resource, ResourceContents, Role};

pub const CORE_URI: &str = "mebaco://model/core";
pub const COMPONENTS_URI: &str = "mebaco://model/components-and-retention";
pub const STYLES_URI: &str = "mebaco://model/styles";

const CORE: &str = include_str!("../resources/model-core.md");
const COMPONENTS: &str = include_str!("../resources/components-and-retention.md");
const STYLES: &str = include_str!("../resources/styles.md");

pub fn list() -> Vec<Resource> {
    vec![
        Resource::new(CORE_URI, "mebaco-model-core")
            .with_title("Mebaco Development Model: Core")
            .with_description(
                "Read first. The minimal authoritative model for interpreting every Mebaco project, including App Entry, live state, components, and Retention.",
            )
            .with_mime_type("text/markdown")
            .with_annotations(
                Annotations::default()
                    .with_audience(vec![Role::Assistant])
                    .with_priority(1.0),
            ),
        Resource::new(COMPONENTS_URI, "mebaco-components-and-retention")
            .with_title("Mebaco Components and Retention")
            .with_description(
                "Read before detailed component, scope, local declaration, or local component analysis.",
            )
            .with_mime_type("text/markdown")
            .with_annotations(
                Annotations::default()
                    .with_audience(vec![Role::Assistant])
                    .with_priority(0.7),
            ),
        Resource::new(STYLES_URI, "mebaco-style-model")
            .with_title("Mebaco Style Model")
            .with_description(
                "Read before detailed style review. Defines formulas, parameters, inheritance, defaults, and delegation.",
            )
            .with_mime_type("text/markdown")
            .with_annotations(
                Annotations::default()
                    .with_audience(vec![Role::Assistant])
                    .with_priority(0.5),
            ),
    ]
}

pub fn read(uri: &str) -> Option<ResourceContents> {
    let text = match uri {
        CORE_URI => CORE,
        COMPONENTS_URI => COMPONENTS,
        STYLES_URI => STYLES,
        _ => return None,
    };
    Some(
        ResourceContents::text(text, uri)
            .with_mime_type("text/markdown")
            .with_meta(MetaObject(
                serde_json::json!({
                    "mebaco/modelVersion": "1",
                    "mebaco/resourceScope": match uri {
                        CORE_URI => "stable-core",
                        COMPONENTS_URI => "components-and-retention",
                        STYLES_URI => "styles",
                        _ => unreachable!(),
                    },
                })
                .as_object()
                .expect("static resource metadata is an object")
                .clone(),
            )),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_unique_fixed_resources() {
        let resources = list();
        assert_eq!(resources.len(), 3);
        let mut uris = resources
            .iter()
            .map(|resource| &resource.uri)
            .collect::<Vec<_>>();
        uris.sort();
        uris.dedup();
        assert_eq!(uris.len(), resources.len());
    }

    #[test]
    fn core_covers_entry_and_retention() {
        let ResourceContents::TextResourceContents { text, .. } = read(CORE_URI).unwrap() else {
            panic!("core must be text");
        };
        assert!(text.contains("## App entry model"));
        assert!(text.contains("## Components and content"));
        assert!(text.contains("Retention is a primary Mebaco concept"));
    }

    #[test]
    fn detail_resources_cover_key_contracts() {
        let ResourceContents::TextResourceContents {
            text: components, ..
        } = read(COMPONENTS_URI).unwrap()
        else {
            panic!("components must be text");
        };
        let ResourceContents::TextResourceContents { text: styles, .. } = read(STYLES_URI).unwrap()
        else {
            panic!("styles must be text");
        };
        assert!(components.replace("\r\n", "\n").contains(
            "component\n├─ props\n├─ store\n│  ├─ states\n│  └─ effects\n├─ retention\n└─ elements"
        ));
        assert!(styles.contains("### `delegate`"));
        assert!(styles.contains("### `default`"));
        assert!(styles.contains("### `value`"));
    }

    #[test]
    fn rejects_unknown_resource() {
        assert!(read("mebaco://model/unknown").is_none());
    }
}
