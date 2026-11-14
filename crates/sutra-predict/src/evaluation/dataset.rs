pub struct BenchmarkDataset {
    pub name: &'static str,
    pub train_sequences: Vec<Vec<String>>,
    pub test_sequences: Vec<Vec<String>>,
}

impl BenchmarkDataset {
    pub fn standard_developer_benchmark() -> Self {
        let dev_seq1 = vec![
            "open_vscode".to_string(),
            "open_project".to_string(),
            "open_terminal".to_string(),
            "run_dev_server".to_string(),
            "open_browser".to_string(),
        ];
        let dev_seq2 = vec![
            "open_vscode".to_string(),
            "open_project".to_string(),
            "open_terminal".to_string(),
            "run_dev_server".to_string(),
            "open_browser".to_string(),
        ];
        let dev_seq3 = vec![
            "open_vscode".to_string(),
            "open_project".to_string(),
            "git_status".to_string(),
            "git_commit".to_string(),
            "git_push".to_string(),
            "open_browser".to_string(),
        ];
        let research_seq = vec![
            "open_browser".to_string(),
            "search_docs".to_string(),
            "copy_snippet".to_string(),
            "open_vscode".to_string(),
            "paste_snippet".to_string(),
        ];

        // Train on multiple repeated instances to form established transition matrices
        let train_sequences = vec![
            dev_seq1.clone(),
            dev_seq1.clone(),
            dev_seq1.clone(),
            dev_seq2.clone(),
            dev_seq2.clone(),
            dev_seq3.clone(),
            dev_seq3.clone(),
            research_seq.clone(),
            research_seq.clone(),
        ];

        let test_sequences = vec![
            dev_seq1,
            dev_seq3,
            research_seq,
        ];

        Self {
            name: "Standard Developer & Research Workflow Benchmark",
            train_sequences,
            test_sequences,
        }
    }
}
